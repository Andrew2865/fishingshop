import pool from '../config/db.js';

export const getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO categories (name, description, image_url) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, image_url || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const updateCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, image_url } = req.body;

    const current = await pool.query('SELECT * FROM categories WHERE id=$1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Kategoria nie istnieje' });

    const newName = name ?? current.rows[0].name;
    const newDesc = description ?? current.rows[0].description;
    const newImg = image_url ?? current.rows[0].image_url;

    const result = await pool.query(
      'UPDATE categories SET name=$1, description=$2, image_url=$3 WHERE id=$4 RETURNING *',
      [newName, newDesc, newImg, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query('DELETE FROM categories WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Kategoria nie istnieje' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
