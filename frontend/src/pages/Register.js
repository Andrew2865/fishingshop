import { useState } from 'react';
import { register, login } from '../services/auth';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  try {
    await register({ name, email, password });
  } catch (err) {
    setError(err?.response?.data?.error || 'Rejestracja nieudana (email może być zajęty).');
    return;
  }

  try {
    const res = await login({ email, password });
    localStorage.setItem('token', res.data.token);
    navigate('/');
  } catch (err) {
    setError(err?.response?.data?.error || 'Konto utworzone, ale logowanie nie działa. Spróbuj zalogować się ręcznie.');
  }
};


  return (
    <div className="container mt-5" style={{ maxWidth: 420 }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-3">Rejestracja</h2>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Imię</label>
              <input
                className="form-control"
                placeholder="Wpisz imię"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                placeholder="Wpisz email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Hasło</label>
              <input
                className="form-control"
                type="password"
                placeholder="Utwórz hasło"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-success w-100">
              Utwórz konto
            </button>
          </form>

          <p className="mt-3 mb-0 text-center">
            Masz konto? <Link to="/login">Zaloguj się</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
