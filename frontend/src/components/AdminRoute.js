import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getMe } from '../services/user';

export default function AdminRoute({ children }) {
  const [state, setState] = useState({ loading: true, ok: false });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return setState({ loading: false, ok: false });

    getMe()
      .then((res) => setState({ loading: false, ok: res.data?.role === 'admin' }))
      .catch(() => setState({ loading: false, ok: false }));
  }, []);

  if (state.loading) return <div className="container mt-4">Ładowanie…</div>;
  if (!state.ok) return <Navigate to="/" replace />;
  return children;
}
