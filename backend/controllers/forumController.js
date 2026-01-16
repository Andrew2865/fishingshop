import pool from '../config/db.js';

export const getPosts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        fp.id,
        fp.title,
        fp.content,
        fp.created_at,
        u.id AS user_id,
        u.name AS author_name,
        u.avatar_url
       FROM forum_posts fp
       JOIN users u ON u.id = fp.user_id
       ORDER BY fp.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Tytuł i treść są wymagane' });
    }

    const result = await pool.query(
      `INSERT INTO forum_posts (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, title, content, created_at`,
      [userId, title, content]
    );

    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Public: pobranie pojedynczego wpisu (szczegóły)
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        fp.id,
        fp.title,
        fp.content,
        fp.created_at,
        u.id AS user_id,
        u.name AS author_name,
        u.avatar_url
       FROM forum_posts fp
       JOIN users u ON u.id = fp.user_id
       WHERE fp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono wpisu.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Public: lista komentarzy do wpisu
export const getCommentsByPostId = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        fc.id,
        fc.post_id,
        fc.content,
        fc.created_at,
        u.id AS user_id,
        u.name AS author_name,
        u.avatar_url
       FROM forum_comments fc
       JOIN users u ON u.id = fc.user_id
       WHERE fc.post_id = $1
       ORDER BY fc.created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Auth: dodanie komentarza
export const createComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // post id
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Treść komentarza jest wymagana' });
    }

    // upewnij się, że post istnieje
    const postCheck = await pool.query('SELECT id FROM forum_posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono wpisu.' });
    }

    const result = await pool.query(
      `INSERT INTO forum_comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, created_at`,
      [id, userId, content]
    );

    res.json({ success: true, comment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
