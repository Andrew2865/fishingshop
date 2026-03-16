import pool from '../config/db.js';

const ensureForumCommentImagesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS forum_comment_images (
      id SERIAL PRIMARY KEY,
      comment_id INTEGER NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_forum_comment_images_comment_id ON forum_comment_images(comment_id)`);
};

const withImages = async (rows) => {
  if (!rows || rows.length === 0) return rows;
  const ids = rows.map((row) => row.id);
  const imageResult = await pool.query(
    `SELECT id, post_id, image_url, created_at
     FROM forum_post_images
     WHERE post_id = ANY($1::int[])
     ORDER BY id ASC`,
    [ids]
  );

  const imagesByPost = new Map();
  for (const row of imageResult.rows) {
    if (!imagesByPost.has(row.post_id)) imagesByPost.set(row.post_id, []);
    imagesByPost.get(row.post_id).push(row.image_url);
  }

  return rows.map((row) => ({
    ...row,
    images: imagesByPost.get(row.id) || [],
  }));
};

const withCommentImages = async (rows) => {
  if (!rows || rows.length === 0) return rows;
  await ensureForumCommentImagesTable();
  const ids = rows.map((row) => row.id);
  const imageResult = await pool.query(
    `SELECT id, comment_id, image_url, created_at
     FROM forum_comment_images
     WHERE comment_id = ANY($1::int[])
     ORDER BY id ASC`,
    [ids]
  );

  const imagesByComment = new Map();
  for (const row of imageResult.rows) {
    if (!imagesByComment.has(row.comment_id)) imagesByComment.set(row.comment_id, []);
    imagesByComment.get(row.comment_id).push(row.image_url);
  }

  return rows.map((row) => ({
    ...row,
    images: imagesByComment.get(row.id) || [],
  }));
};

export const getPosts = async (req, res) => {
  try {
    const { page, page_size, q } = req.query;
    const params = [];
    const where = [];

    if (q) {
      params.push(`%${String(q).toLowerCase()}%`);
      where.push(`(LOWER(fp.title) LIKE $${params.length} OR LOWER(fp.content) LIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const usePagination = page !== undefined || page_size !== undefined || q !== undefined;

    if (!usePagination) {
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
         ${whereSql}
         ORDER BY fp.created_at DESC`,
        params
      );
      const items = await withImages(result.rows);
      return res.json(items);
    }

    const safePage = Math.max(parseInt(page || '1', 10) || 1, 1);
    const safePageSize = Math.min(Math.max(parseInt(page_size || '10', 10) || 10, 1), 50);
    const offset = (safePage - 1) * safePageSize;

    const countSql = `SELECT COUNT(*)::int AS total FROM forum_posts fp ${whereSql}`;
    const dataSql = `SELECT
        fp.id,
        fp.title,
        fp.content,
        fp.created_at,
        u.id AS user_id,
        u.name AS author_name,
        u.avatar_url
       FROM forum_posts fp
       JOIN users u ON u.id = fp.user_id
       ${whereSql}
       ORDER BY fp.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countSql, params),
      pool.query(dataSql, [...params, safePageSize, offset]),
    ]);

    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / safePageSize), 1);
    const items = await withImages(dataResult.rows);

    res.json({
      items,
      pagination: {
        page: safePage,
        page_size: safePageSize,
        total,
        total_pages: totalPages,
        has_next: safePage < totalPages,
        has_prev: safePage > 1,
      },
      filters: {
        q: q || '',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPost = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const title = req.body?.title?.trim();
    const content = req.body?.content?.trim();
    const files = Array.isArray(req.files) ? req.files : [];

    if (!title || !content) {
      return res.status(400).json({ error: 'Tytuł i treść są wymagane' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO forum_posts (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, title, content, created_at`,
      [userId, title, content]
    );

    const post = result.rows[0];

    for (const file of files) {
      const imageUrl = `/images/forum/${file.filename}`;
      await client.query(
        `INSERT INTO forum_post_images (post_id, image_url)
         VALUES ($1, $2)`,
        [post.id, imageUrl]
      );
    }

    await client.query('COMMIT');

    const postWithImages = {
      ...post,
      images: files.map((file) => `/images/forum/${file.filename}`),
    };

    res.json({ success: true, post: postWithImages });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

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

    const post = (await withImages(result.rows))[0];
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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

    const comments = await withCommentImages(result.rows);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createComment = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const content = req.body?.content?.trim();
    const files = Array.isArray(req.files) ? req.files : [];

    if (!content) {
      return res.status(400).json({ error: 'Treść komentarza jest wymagana' });
    }

    const postCheck = await client.query('SELECT id FROM forum_posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono wpisu.' });
    }

    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_comment_images (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_comment_images_comment_id ON forum_comment_images(comment_id)`);

    const result = await client.query(
      `INSERT INTO forum_comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, created_at`,
      [id, userId, content]
    );

    const comment = result.rows[0];

    for (const file of files) {
      const imageUrl = `/images/forum/${file.filename}`;
      await client.query(
        `INSERT INTO forum_comment_images (comment_id, image_url)
         VALUES ($1, $2)`,
        [comment.id, imageUrl]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      comment: {
        ...comment,
        images: files.map((file) => `/images/forum/${file.filename}`),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
