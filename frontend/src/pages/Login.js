import { useState } from 'react';
import { login } from '../services/auth';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await login({ email, password });
      localStorage.setItem('token', res.data.token);
      const role = res.data?.user?.role;
      if (role === 'warehouse') navigate('/warehouse');
      else if (role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err) {
      setError('Niepoprawny email lub hasło.');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 420 }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-3">Logowanie</h2>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          <form onSubmit={handleSubmit}>
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
                placeholder="Wpisz hasło"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Zaloguj
            </button>
          </form>

          <p className="mt-3 mb-0 text-center">
            Nie masz konta? <Link to="/register">Zarejestruj się</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
