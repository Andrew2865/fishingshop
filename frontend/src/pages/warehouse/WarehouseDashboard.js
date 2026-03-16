import React from 'react';
import { Link } from 'react-router-dom';

export default function WarehouseDashboard() {
  return (
    <div className="container mt-4">
      <h2 className="mb-2">Panel magazyniera</h2>
      <p className="text-muted">Obsługa zamówień, pakowanie i zarządzanie stanami magazynowymi.</p>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Zamówienia</h5>
              <p className="text-muted small">Zmiana statusów, pakowanie, anulowanie i numery przesyłek.</p>
              <Link className="btn btn-success" to="/warehouse/orders">Przejdź do zamówień</Link>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Stan magazynowy</h5>
              <p className="text-muted small">Podgląd ilości produktów, dostawy i korekty stanów.</p>
              <Link className="btn btn-primary" to="/warehouse/products">Przejdź do magazynu</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
