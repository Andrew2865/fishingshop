import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT id, name, email, role, created_at, avatar_url FROM users WHERE id=$1',
      [userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, avatar_url } = req.body;

    if (!name && !email && !avatar_url) {
      return res.status(400).json({ error: 'Brak danych do aktualizacji' });
    }

    if (email) {
      const exists = await pool.query(
        'SELECT id FROM users WHERE email=$1 AND id<>$2',
        [email, userId]
      );
      if (exists.rows.length) return res.status(400).json({ error: 'Email jest już zajęty' });
    }

    const current = await pool.query(
      'SELECT name, email, avatar_url FROM users WHERE id=$1',
      [userId]
    );
    if (!current.rows.length) return res.status(404).json({ error: 'Użytkownik nie istnieje' });

    const newName = name ?? current.rows[0].name;
    const newEmail = email ?? current.rows[0].email;
    const newAvatar = avatar_url ?? current.rows[0].avatar_url;

    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2, avatar_url=$3 WHERE id=$4 RETURNING id, name, email, role, created_at, avatar_url',
      [newName, newEmail, newAvatar, userId]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Podaj obecne i nowe hasło' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Nowe hasło musi mieć min. 6 znaków' });
    }

    const result = await pool.query('SELECT password FROM users WHERE id=$1', [userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Użytkownik nie istnieje' });

    const ok = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!ok) return res.status(400).json({ error: 'Niepoprawne obecne hasło' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, userId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const setAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Brak pliku' });
    const userId = req.user.id;
    const avatarUrl = `/images/avatars/${req.file.filename}`;

    const result = await pool.query(
      'UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id, name, email, role, created_at, avatar_url',
      [avatarUrl, userId]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
