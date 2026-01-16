import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

// Uwaga: rola w JWT może się zdezaktualizować, jeśli zmienisz role w bazie.
// Dlatego po weryfikacji tokena pobieramy aktualnego użytkownika z DB.
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nieautoryzowany' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, role, iat, exp }

    const result = await pool.query(
      'SELECT id, role FROM users WHERE id=$1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Użytkownik nie istnieje' });
    }

    req.user = { id: result.rows[0].id, role: result.rows[0].role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Niepoprawny token' });
  }
};

export const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Brak dostępu' });
  }
  next();
};
