import pool from '../config/db.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT
        ci.id,
        ci.quantity,
        p.id AS product_id,
        p.name,
        p.price,
        p.image_url,
        p.is_active
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1
       ORDER BY ci.id`,
      [userId]
    );
    res.json(result.rows.filter(r => r.is_active));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Brak product_id' });

    const prod = await pool.query('SELECT id, stock, is_active FROM products WHERE id=$1', [product_id]);
    if (!prod.rows.length) return res.status(404).json({ error: 'Produkt nie istnieje' });
    if (!prod.rows[0].is_active) return res.status(400).json({ error: 'Produkt jest wycofany ze sprzedaży' });

    const q = Number(quantity);
    if (!q || q <= 0) return res.status(400).json({ error: 'Niepoprawna ilość' });
    if (prod.rows[0].stock < q) return res.status(400).json({ error: 'Brak wystarczającego stanu magazynowego' });

    const existing = await pool.query(
      'SELECT * FROM cart_items WHERE user_id=$1 AND product_id=$2',
      [userId, product_id]
    );

    if (existing.rows.length) {
      const newQty = existing.rows[0].quantity + q;
      if (prod.rows[0].stock < newQty) return res.status(400).json({ error: 'Brak wystarczającego stanu magazynowego' });

      const updated = await pool.query(
        'UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING *',
        [newQty, existing.rows[0].id]
      );
      return res.json(updated.rows[0]);
    }

    const inserted = await pool.query(
      'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,$3) RETURNING *',
      [userId, product_id, q]
    );
    res.json(inserted.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    const q = Number(quantity);
    if (!q || q <= 0) return res.status(400).json({ error: 'Niepoprawna ilość' });

    const item = await pool.query('SELECT id, product_id, user_id FROM cart_items WHERE id=$1', [id]);
    if (!item.rows.length) return res.status(404).json({ error: 'Pozycja nie istnieje' });
    if (Number(item.rows[0].user_id) !== Number(userId)) return res.status(403).json({ error: 'Brak dostępu' });

    const prod = await pool.query('SELECT stock, is_active FROM products WHERE id=$1', [item.rows[0].product_id]);
    if (!prod.rows.length) return res.status(404).json({ error: 'Produkt nie istnieje' });
    if (!prod.rows[0].is_active) return res.status(400).json({ error: 'Produkt jest wycofany ze sprzedaży' });
    if (prod.rows[0].stock < q) return res.status(400).json({ error: 'Brak wystarczającego stanu magazynowego' });

    const result = await pool.query('UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING *', [q, id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const item = await pool.query('SELECT user_id FROM cart_items WHERE id=$1', [id]);
    if (!item.rows.length) return res.status(404).json({ error: 'Pozycja nie istnieje' });
    if (Number(item.rows[0].user_id) !== Number(userId)) return res.status(403).json({ error: 'Brak dostępu' });

    await pool.query('DELETE FROM cart_items WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
