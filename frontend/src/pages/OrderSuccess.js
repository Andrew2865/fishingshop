import { Link, useParams } from 'react-router-dom';

export default function OrderSuccess() {
  const { id } = useParams();

  return (
    <div className="container mt-4">
      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="mb-2">✅ Zamówienie zostało złożone!</h2>
          <div className="text-muted mb-3">
            {id ? <>Numer zamówienia: <strong>#{id}</strong></> : 'Dziękujemy za zakupy!'}
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <Link className="btn btn-primary" to="/products">Wróć do produktów</Link>
            <Link className="btn btn-outline-secondary" to="/profile">Przejdź do profilu</Link>
            <Link className="btn btn-outline-dark" to="/forum">Forum</Link>
          </div>

          <div className="text-muted small mt-3">
            Status zamówienia: <strong>pending</strong> (przekazane do realizacji).
          </div>
        </div>
      </div>
    </div>
  );
}
