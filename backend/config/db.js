import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log('Połączono z bazą PostgreSQL'))
  .catch(err => console.error('Błąd połączenia z bazą:', err));

export default pool;
