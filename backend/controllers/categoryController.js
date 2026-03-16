import pool from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const categoryFolder = path.join(__dirname, '..', 'public', 'images', 'category');

const buildCategoryImageUrl = (filename) => (filename ? `/images/category/${filename}` : null);

const tryDeleteCategoryImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    if (!imageUrl.startsWith('/images/category/')) return;
    const filename = imageUrl.replace('/images/category/', '');
    const filePath = path.join(categoryFolder, filename);
    await fs.unlink(filePath);
  } catch {
  }
};

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

    
    const uploadedUrl = req.file ? buildCategoryImageUrl(req.file.filename) : null;
    const finalImageUrl = uploadedUrl ?? (image_url || null);

    const result = await pool.query(
      'INSERT INTO categories (name, description, image_url) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, finalImageUrl]
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

    let newImg = current.rows[0].image_url;
    const uploadedUrl = req.file ? buildCategoryImageUrl(req.file.filename) : null;
    if (uploadedUrl) {
      await tryDeleteCategoryImage(current.rows[0].image_url);
      newImg = uploadedUrl;
    } else if (image_url !== undefined) {
      newImg = image_url || null;
    }

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
    const current = await pool.query('SELECT * FROM categories WHERE id=$1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Kategoria nie istnieje' });

    const result = await pool.query('DELETE FROM categories WHERE id=$1 RETURNING id', [id]);
    await tryDeleteCategoryImage(current.rows[0].image_url);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
