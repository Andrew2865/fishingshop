import pool from '../config/db.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

function canSendMail() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendOrderEmail(toEmail, orderId) {
  if (!canSendMail() || !toEmail) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Potwierdzenie zamówienia',
    text: `Dziękujemy! Zamówienie nr: ${orderId}`,
  });
}

/**
 * Logged-in user order:
 * - creates order from current DB cart (cart_items)
 * - inserts order_items with current product price (snapshot)
 * - reduces stock
 * - clears cart
 */
export const createOrder = async (req, res) => {
  const userId = req.user.id;

  try {
    // cart with product data
    const cart = await pool.query(
      `SELECT ci.id AS cart_item_id, ci.product_id, ci.quantity, p.price, p.stock, p.is_active
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id=$1`,
      [userId]
    );

    if (cart.rows.length === 0) return res.status(400).json({ error: 'Koszyk pusty' });

    // validate products
    for (const item of cart.rows) {
      if (!item.is_active) return res.status(400).json({ error: 'W koszyku jest produkt wycofany ze sprzedaży' });
      if (item.stock < item.quantity) return res.status(400).json({ error: 'Brak wystarczającego stanu magazynowego' });
    }

    const total = cart.rows.reduce((acc, item) => acc + Number(item.quantity) * Number(item.price), 0);

    await pool.query('BEGIN');

    const order = await pool.query(
      'INSERT INTO orders (user_id, total_price, status) VALUES ($1,$2,$3) RETURNING *',
      [userId, total, 'pending']
    );
    const orderId = order.rows[0].id;

    for (const item of cart.rows) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      await pool.query(
        'UPDATE products SET stock = stock - $1 WHERE id=$2',
        [item.quantity, item.product_id]
      );
    }

    // clear cart
    await pool.query('DELETE FROM cart_items WHERE user_id=$1', [userId]);

    await pool.query('COMMIT');

    // try email (if configured)
    const user = await pool.query('SELECT email FROM users WHERE id=$1', [userId]);
    await sendOrderEmail(user.rows[0]?.email, orderId).catch(() => {});

    res.json({ success: true, order: order.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  }
};

/**
 * Guest order:
 * body:
 * {
 *   customer: { name,email,phone,address_line1,address_line2,city,postal_code,country },
 *   items: [{ product_id, quantity }]
 * }
 */
export const createGuestOrder = async (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Brak danych zamówienia' });
    }

    const required = ['name','email','address_line1','city','postal_code','country'];
    for (const k of required) {
      if (!customer[k]) return res.status(400).json({ error: `Brak pola: customer.${k}` });
    }

    // fetch products to get current prices + stock
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

    const total = items.reduce((acc, it) => {
      const p = byId.get(Number(it.product_id));
      return acc + Number(it.quantity) * Number(p.price);
    }, 0);

    await pool.query('BEGIN');

    const order = await pool.query(
      `INSERT INTO orders
        (user_id, total_price, status, customer_name, customer_email, phone,
         address_line1, address_line2, city, postal_code, country)
       VALUES (NULL, $1, 'pending', $2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        total,
        customer.name,
        customer.email,
        customer.phone || null,
        customer.address_line1,
        customer.address_line2 || null,
        customer.city,
        customer.postal_code,
        customer.country,
      ]
    );
    const orderId = order.rows[0].id;

    for (const it of items) {
      const p = byId.get(Number(it.product_id));
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [orderId, Number(it.product_id), Number(it.quantity), Number(p.price)]
      );

      await pool.query('UPDATE products SET stock = stock - $1 WHERE id=$2', [Number(it.quantity), Number(it.product_id)]);
    }

    await pool.query('COMMIT');

    await sendOrderEmail(customer.email, orderId).catch(() => {});

    res.json({ success: true, order: order.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
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
