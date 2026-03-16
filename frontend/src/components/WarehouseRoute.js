import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '../services/user';

export default function WarehouseRoute({ children }) {
  const [state, setState] = useState({ loading: true, ok: false });

  useEffect(() => {
    getMe()
      .then((res) => setState({ loading: false, ok: ['warehouse', 'admin'].includes(res.data?.role) }))
      .catch(() => setState({ loading: false, ok: false }));
  }, []);

  if (state.loading) return <div className="container mt-4">Sprawdzanie uprawnień…</div>;
  return state.ok ? children : <Navigate to="/login" replace />;
}
