import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMe } from '../services/user';

function imgSrc(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:5000${url}`;
}

export default function Header() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    getMe()
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, [token]);

  const logout = () => {
    localStorage.removeItem('token');
    setMe(null);
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" to="/">Fishing Shop</Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav ms-auto align-items-lg-center">
            <li className="nav-item">
              <Link className="nav-link" to="/products">Produkty</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/forum">Forum</Link>
            </li>
            {me?.role === "admin" ? (
              <li className="nav-item">
                <Link className="nav-link" to="/admin">Admin</Link>
              </li>
            ) : null}
            <li className="nav-item">
              <Link className="nav-link" to="/cart">Koszyk</Link>
            </li>

            {!token ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">Logowanie</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/register">Rejestracja</Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link d-inline-flex align-items-center gap-2" to="/profile">
                    {me?.avatar_url ? (
                      <img
                        src={imgSrc(me.avatar_url)}
                        alt={me?.name || 'avatar'}
                        style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span
                        className="bg-light border"
                        style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-block' }}
                        aria-hidden="true"
                      />
                    )}
                    <span>{me?.name ? `Witaj, ${me.name}` : 'Profil'}</span>
                  </Link>
                </li>
                <li className="nav-item ms-lg-2">
                  <button className="btn btn-outline-light btn-sm" onClick={logout}>
                    Wyloguj
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
