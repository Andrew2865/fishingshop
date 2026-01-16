import pool from '../config/db.js';


export const getProducts = async (req, res) => {
  try {
    const { category_id, q } = req.query;

    const params = [];
    const where = ['is_active = true'];

    if (category_id) {
      params.push(Number(category_id));
      where.push(`category_id = $${params.length}`);
    }

    if (q) {
      params.push(`%${String(q).toLowerCase()}%`);
      where.push(`(LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(description,'')) LIKE $${params.length})`);
    }

    const sql = `SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY id`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produkt nie istnieje' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      old_price,
      stock,
      category_id,
      image_url,
      is_featured,
      is_promo,
      is_active,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products
        (name, description, price, old_price, stock, category_id, image_url, is_featured, is_promo, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name,
        description || null,
        price,
        old_price ?? null,
        stock ?? 0,
        category_id ?? null,
        image_url ?? null,
        Boolean(is_featured),
        Boolean(is_promo),
        is_active === undefined ? true : Boolean(is_active),
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      old_price,
      stock,
      category_id,
      image_url,
      is_featured,
      is_promo,
      is_active,
    } = req.body;

    const result = await pool.query(
      `UPDATE products SET
        name=$1,
        description=$2,
        price=$3,
        old_price=$4,
        stock=$5,
        category_id=$6,
        image_url=COALESCE($7, image_url),
        is_featured=$8,
        is_promo=$9,
        is_active=$10
       WHERE id=$11
       RETURNING *`,
      [
        name,
        description || null,
        price,
        old_price ?? null,
        stock ?? 0,
        category_id ?? null,
        image_url ?? null,
        Boolean(is_featured),
        Boolean(is_promo),
        is_active === undefined ? true : Boolean(is_active),
        id,
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Produkt nie istnieje' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE products SET is_active=false WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produkt nie istnieje' });
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const setProductImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Brak pliku" });

    const id = Number(req.params.id);
    const imageUrl = `/images/products/${req.file.filename}`;

    const result = await pool.query(
      "UPDATE products SET image_url=$1 WHERE id=$2 RETURNING id, image_url",
      [imageUrl, id]
    );

    console.log("setProductImage:", { id, imageUrl, updated: result.rows[0] });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produkt nie istnieje" });
    }

    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error("setProductImage error:", err);
    res.status(500).json({ error: err.message });
  }
};



export const getAllProductsAdmin = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
