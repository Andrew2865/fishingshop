import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="container mt-4">
      <h2 className="mb-2">Panel administracyjny</h2>
      <p className="text-muted">Zarządzaj produktami, kategoriami i promocjami.</p>

      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Produkty</h5>
              <p className="text-muted small">Dodawanie, edycja, usuwanie, promocje, zdjęcia.</p>
              <Link className="btn btn-primary" to="/admin/products">Zarządzaj produktami</Link>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Kategorie</h5>
              <p className="text-muted small">Dodawanie, edycja, usuwanie kategorii.</p>
              <Link className="btn btn-dark" to="/admin/categories">Zarządzaj kategoriami</Link>
            </div>
          </div>
        </div>



        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Zamówienia</h5>
              <p className="text-muted small">Podgląd wszystkich zamówień, zmiana statusu i numeru przesyłki.</p>
              <Link className="btn btn-success" to="/admin/orders">Zarządzaj zamówieniami</Link>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Promocje</h5>
              <p className="text-muted small">
                Promocje są obsługiwane w produktach: <code>old_price</code>, <code>is_promo</code>, <code>is_featured</code>.
              </p>
              <Link className="btn btn-outline-secondary" to="/admin/products">Ustaw promocje</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
