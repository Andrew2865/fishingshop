import pool from '../config/db.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

function canSendMail() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporterCache = null;
function getTransporter() {
  if (!canSendMail()) return null;
  if (!transporterCache) {
    transporterCache = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporterCache;
}

function shippingPrice(method) {
  const m = String(method || '').toLowerCase();
  const prices = {
    inpost: 14.99,
    dpd: 18.99,
    gls: 17.99,
    pocztapolska: 12.99,
  };
  return prices[m] ?? prices.inpost;
}

function normalizeShippingMethod(method) {
  const m = String(method || 'inpost').toLowerCase();
  const allowed = new Set(['dpd', 'gls', 'pocztapolska', 'inpost']);
  return allowed.has(m) ? m : 'inpost';
}

function buildAddressSnapshot(customer) {
  const c = customer || {};
  return {
    customer_name: c.name || null,
    customer_email: c.email || null,
    phone: c.phone || null,
    address_line1: c.address_line1 || null,
    address_line2: c.address_line2 || null,
    city: c.city || null,
    postal_code: c.postal_code || null,
    country: c.country || null,
  };
}

function validateSnapshot(snapshot) {
  const required = ['customer_name', 'customer_email', 'address_line1', 'city', 'postal_code', 'country'];
  for (const k of required) {
    if (!snapshot[k]) return `Brak pola: ${k.replace('customer_', 'customer.')}`;
  }
  return null;
}

function normalizeOrderStatus(status) {
  const allowed = new Set(['pending', 'processing', 'packed', 'shipped', 'completed', 'canceled']);
  const value = String(status || '').toLowerCase().trim();
  return allowed.has(value) ? value : null;
}

async function sendOrderEmail(toEmail, order, items) {
  if (!canSendMail() || !toEmail) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const lines = [];
  lines.push('Dziękujemy za zamówienie w Fishing Shop!');
  lines.push(`Zamówienie nr: ${order.id}`);
  lines.push(`Status: ${order.status}`);
  lines.push('');
  lines.push('Pozycje:');
  for (const it of items) {
    lines.push(`- ${it.name} x${it.quantity} = ${(Number(it.price) * Number(it.quantity)).toFixed(2)} zł`);
  }
  lines.push('');
  lines.push(`Dostawa: ${order.shipping_method || 'inpost'} (${Number(order.shipping_price || 0).toFixed(2)} zł)`);
  lines.push(`Suma: ${Number(order.total_price).toFixed(2)} zł`);
  lines.push('');
  lines.push('Adres dostawy:');
  lines.push(`${order.customer_name || ''}`);
  lines.push(`${order.address_line1 || ''}${order.address_line2 ? ', ' + order.address_line2 : ''}`);
  lines.push(`${order.postal_code || ''} ${order.city || ''}`);
  lines.push(`${order.country || ''}`);
  if (order.delivery_notes) {
    lines.push('');
    lines.push(`Uwagi: ${order.delivery_notes}`);
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `Fishing Shop – potwierdzenie zamówienia #${order.id}`,
    text: lines.join('\n'),
  });
}

export const createOrder = async (req, res) => {
  const userId = req.user.id;

  try {
    const { customer, shipping_method, delivery_notes } = req.body || {};
    const shipMethod = normalizeShippingMethod(shipping_method);
    const shipPrice = shippingPrice(shipMethod);

    const userRes = await pool.query('SELECT name, email FROM users WHERE id=$1', [userId]);
    const u = userRes.rows[0] || {};

    const snapshot = buildAddressSnapshot({
      ...customer,
      name: customer?.name || u.name,
      email: customer?.email || u.email,
    });

    const vErr = validateSnapshot(snapshot);
    if (vErr) return res.status(400).json({ error: vErr });

    const cart = await pool.query(
      `SELECT ci.id AS cart_item_id, ci.product_id, ci.quantity, p.price, p.stock, p.is_active
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id=$1`,
      [userId]
    );

    if (cart.rows.length === 0) return res.status(400).json({ error: 'Koszyk pusty' });

    for (const it of cart.rows) {
      if (!it.is_active) return res.status(400).json({ error: 'W koszyku jest produkt wycofany ze sprzedaży' });
      if (it.stock < it.quantity) return res.status(400).json({ error: 'Brak wystarczającego stanu magazynowego' });
    }

    const productsTotal = cart.rows.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
    const total = productsTotal + shipPrice;

    await pool.query('BEGIN');

    const orderRes = await pool.query(
      `INSERT INTO orders
        (user_id, total_price, status, shipping_method, shipping_price, delivery_notes,
         customer_name, customer_email, phone, address_line1, address_line2, city, postal_code, country)
       VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        userId,
        total,
        shipMethod,
        shipPrice,
        delivery_notes || null,
        snapshot.customer_name,
        snapshot.customer_email,
        snapshot.phone,
        snapshot.address_line1,
        snapshot.address_line2,
        snapshot.city,
        snapshot.postal_code,
        snapshot.country,
      ]
    );

    const order = orderRes.rows[0];

    for (const it of cart.rows) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [order.id, it.product_id, it.quantity, it.price]
      );
      await pool.query('UPDATE products SET stock = stock - $1 WHERE id=$2', [it.quantity, it.product_id]);
    }

    await pool.query('DELETE FROM cart_items WHERE user_id=$1', [userId]);
    await pool.query('COMMIT');

    const itemsRes = await pool.query(
      `SELECT oi.product_id, oi.quantity, oi.price, p.name
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [order.id]
    );

    const mail = await sendOrderEmail(order.customer_email || u.email, order, itemsRes.rows).catch((e) => ({ sent: false, reason: e.message }));
    res.json({ success: true, order, mail });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  }
};

export const createGuestOrder = async (req, res) => {
  try {
    const { customer, items, shipping_method, delivery_notes } = req.body || {};
    const shipMethod = normalizeShippingMethod(shipping_method);
    const shipPrice = shippingPrice(shipMethod);

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Brak danych zamówienia' });
    }

    const snapshot = buildAddressSnapshot(customer);
    const vErr = validateSnapshot(snapshot);
    if (vErr) return res.status(400).json({ error: vErr });

    const ids = items.map(i => Number(i.product_id)).filter(Boolean);
    const prodRes = await pool.query(
      'SELECT id, price, stock, is_active FROM products WHERE id = ANY($1::int[])',
      [ids]
    );
    const byId = new Map(prodRes.rows.map(p => [p.id, p]));

    for (const it of items) {
      const p = byId.get(Number(it.product_id));
      if (!p) return res.status(400).json({ error: 'Niepoprawny produkt w zamówieniu' });
      if (!p.is_active) return res.status(400).json({ error: 'Produkt wycofany ze sprzedaży' });
      if (p.stock < Number(it.quantity)) return res.status(400).json({ error: 'Brak wystarczającego stanu magazynowego' });
    }

    const productsTotal = items.reduce((s, it) => s + Number(it.quantity) * Number(byId.get(Number(it.product_id)).price), 0);
    const total = productsTotal + shipPrice;

    await pool.query('BEGIN');

    const orderRes = await pool.query(
      `INSERT INTO orders
        (user_id, total_price, status, shipping_method, shipping_price, delivery_notes,
         customer_name, customer_email, phone, address_line1, address_line2, city, postal_code, country)
       VALUES (NULL,$1,'pending',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        total,
        shipMethod,
        shipPrice,
        delivery_notes || null,
        snapshot.customer_name,
        snapshot.customer_email,
        snapshot.phone,
        snapshot.address_line1,
        snapshot.address_line2,
        snapshot.city,
        snapshot.postal_code,
        snapshot.country,
      ]
    );

    const order = orderRes.rows[0];

    for (const it of items) {
      const p = byId.get(Number(it.product_id));
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [order.id, Number(it.product_id), Number(it.quantity), Number(p.price)]
      );
      await pool.query('UPDATE products SET stock = stock - $1 WHERE id=$2', [Number(it.quantity), Number(it.product_id)]);
    }

    await pool.query('COMMIT');

    const itemsRes = await pool.query(
      `SELECT oi.product_id, oi.quantity, oi.price, p.name
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [order.id]
    );

    const mail = await sendOrderEmail(snapshot.customer_email, order, itemsRes.rows).catch((e) => ({ sent: false, reason: e.message }));
    res.json({ success: true, order, mail });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        o.*,
        COALESCE(SUM(oi.quantity), 0) AS items_count,
        u.name AS handled_by_name
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN users u ON u.id = o.handled_by
       GROUP BY o.id, u.name
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateOrderAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_number } = req.body || {};

    const currentRes = await pool.query('SELECT * FROM orders WHERE id=$1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Zamówienie nie istnieje.' });

    const current = currentRes.rows[0];
    const nextStatus = status !== undefined ? normalizeOrderStatus(status) : current.status;
    if (status !== undefined && !nextStatus) {
      return res.status(400).json({ error: 'Niepoprawny status zamówienia.' });
    }

    const nextTracking = tracking_number !== undefined ? (String(tracking_number || '').trim() || null) : current.tracking_number;
    const nextHandledBy = req.user?.id || current.handled_by || null;
    const nextShippedAt = nextStatus === 'shipped' ? (current.shipped_at || new Date()) : current.shipped_at;
    const nextCompletedAt = nextStatus === 'completed' ? (current.completed_at || new Date()) : current.completed_at;

    const result = await pool.query(
      `UPDATE orders
       SET status=$1,
           tracking_number=$2,
           handled_by=$3,
           shipped_at=$4,
           completed_at=$5
       WHERE id=$6
       RETURNING *`,
      [nextStatus, nextTracking, nextHandledBy, nextShippedAt, nextCompletedAt, id]
    );

    const updatedOrder = result.rows[0];
    let mail = { sent: false, skipped: true, reason: 'status-not-changed' };
    const shouldSend = current.status !== updatedOrder.status || current.tracking_number !== updatedOrder.tracking_number;

    if (shouldSend) {
      const itemsRes = await pool.query(
        `SELECT oi.product_id, oi.quantity, oi.price, p.name
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1
         ORDER BY oi.id`,
        [updatedOrder.id]
      );

      try {
        mail = await sendOrderEmail(updatedOrder.customer_email, updatedOrder, itemsRes.rows);
      } catch (e) {
        mail = { sent: false, reason: e.message };
      }
    }

    res.json({ ...updatedOrder, mail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'product_id', oi.product_id,
              'name', p.name,
              'image_url', p.image_url,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
