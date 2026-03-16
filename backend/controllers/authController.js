import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildAuthResponse(user, token) {
  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url || null,
    },
  };
}

export const registerUser = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Uzupełnij imię, e-mail i hasło.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Hasło musi mieć co najmniej 6 znaków.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Użytkownik z tym adresem e-mail już istnieje.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, avatar_url`,
      [name, email, hashedPassword]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const loginUser = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Podaj e-mail i hasło.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Nie ma takiego użytkownika.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Niepoprawne hasło.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json(buildAuthResponse(user, token));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
