import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getMe } from '../services/user';
import { buildImageUrl } from '../config';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const token = localStorage.getItem('token');
  const isWarehouse = me?.role === 'warehouse';
  const isAdmin = me?.role === 'admin';

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    getMe()
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, [token]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem('token');
    setMe(null);
    setMobileOpen(false);
    navigate('/');
  };

  const menuLinks = useMemo(() => {
    const links = [];

    if (!isWarehouse) {
      links.push({ to: '/products', label: 'Produkty' });
      links.push({ to: '/forum', label: 'Forum' });
    }

    if (isAdmin) {
      links.push({ to: '/admin', label: 'Admin' });
    }

    if (isWarehouse || isAdmin) {
      links.push({ to: '/warehouse', label: 'Magazyn' });
    }

    if (!isWarehouse) {
      links.push({ to: '/cart', label: 'Koszyk' });
    }

    if (!token) {
      links.push({ to: '/login', label: 'Logowanie' });
      links.push({ to: '/register', label: 'Rejestracja' });
    } else {
      links.push({ to: '/profile', label: me?.name ? `Witaj, ${me.name}` : 'Profil', isProfile: true });
    }

    return links;
  }, [isAdmin, isWarehouse, me?.name, token]);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand" to={isWarehouse ? '/warehouse' : '/'}>Fishing Shop</Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-controls="mainNavbar"
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse${mobileOpen ? ' show' : ''}`} id="mainNavbar">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-1">
            {menuLinks.map((item) => (
              <li className="nav-item" key={`${item.to}-${item.label}`}>
                <Link className="nav-link d-inline-flex align-items-center gap-2" to={item.to} onClick={() => setMobileOpen(false)}>
                  {item.isProfile ? (
                    <>
                      {me?.avatar_url ? (
                        <img
                          src={buildImageUrl(me.avatar_url)}
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
                      <span>{item.label}</span>
                    </>
                  ) : (
                    item.label
                  )}
                </Link>
              </li>
            ))}

            {token ? (
              <li className="nav-item ms-lg-2">
                <button className="btn btn-outline-light btn-sm mt-2 mt-lg-0" onClick={logout}>
                  Wyloguj
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </nav>
  );
}
