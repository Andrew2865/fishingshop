import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function loadGuestCart() {
  try {
    const raw = localStorage.getItem('guest_cart');
    const cart = JSON.parse(raw || '[]');
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function saveGuestCart(cart) {
  localStorage.setItem('guest_cart', JSON.stringify(cart));
}

export default function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isGuest, setIsGuest] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const token = localStorage.getItem('token');

    if (!token) {
      setIsGuest(true);
      setItems(loadGuestCart());
      return;
    }

    setIsGuest(false);
    try {
      const res = await API.get('/cart');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Nie udało się pobrać koszyka.');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);
  }, [items]);

  // Guest helpers
  const guestUpdateQty = (productId, delta) => {
    const cart = loadGuestCart();
    const idx = cart.findIndex(i => Number(i.product_id) === Number(productId));
    if (idx === -1) return;
    cart[idx].quantity = Number(cart[idx].quantity || 0) + Number(delta);
    if (cart[idx].quantity <= 0) cart.splice(idx, 1);
    saveGuestCart(cart);
    setItems(cart);
  };

  const guestRemove = (productId) => {
    const cart = loadGuestCart().filter(i => Number(i.product_id) !== Number(productId));
    saveGuestCart(cart);
    setItems(cart);
  };

  // Logged-in helpers
  const dbUpdateQty = async (cartItemId, newQty) => {
    if (newQty <= 0) return dbRemove(cartItemId);
    try {
      await API.put(`/cart/${cartItemId}`, { quantity: newQty });
      setItems(prev => prev.map(x => (x.id === cartItemId ? { ...x, quantity: newQty } : x)));
    } catch (e) {
      alert(e?.response?.data?.error || 'Nie udało się zmienić ilości.');
    }
  };

  const dbRemove = async (cartItemId) => {
    try {
      await API.delete(`/cart/${cartItemId}`);
      setItems(prev => prev.filter(x => x.id !== cartItemId));
    } catch {
      alert('Nie udało się usunąć pozycji.');
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h2 className="mb-0">Koszyk</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={load}>Odśwież</button>
      </div>

      {isGuest ? (
        <div className="text-muted small mt-1">Tryb gościa – koszyk zapisany lokalnie (localStorage).</div>
      ) : (
        <div className="text-muted small mt-1">Koszyk konta – zapis w bazie danych.</div>
      )}

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      {items.length === 0 ? (
        <div className="alert alert-secondary mt-3">Koszyk jest pusty.</div>
      ) : (
        <>
          <div className="card shadow-sm mt-3">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Produkt</th>
                      <th className="text-end">Cena</th>
                      <th className="text-center">Ilość</th>
                      <th className="text-end">Suma</th>
                      <th className="text-end">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const key = isGuest ? it.product_id : it.id;
                      const name = it.name || `Produkt #${it.product_id}`;
                      const price = Number(it.price || 0);
                      const qty = Number(it.quantity || 0);

                      return (
                        <tr key={key}>
                          <td style={{ minWidth: 240 }}>
                            <div className="fw-semibold">{name}</div>
                            <div className="text-muted small">
                              {isGuest ? `ID produktu: ${it.product_id}` : `ID koszyka: ${it.id}`}
                            </div>
                          </td>

                          <td className="text-end" style={{ width: 120 }}>{price.toFixed(2)} zł</td>

                          <td className="text-center" style={{ width: 180 }}>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-dark"
                                type="button"
                                onClick={() => isGuest ? guestUpdateQty(it.product_id, -1) : dbUpdateQty(it.id, qty - 1)}
                              >
                                −
                              </button>
                              <span className="btn btn-light" style={{ pointerEvents: 'none', minWidth: 52 }}>{qty}</span>
                              <button
                                className="btn btn-outline-dark"
                                type="button"
                                onClick={() => isGuest ? guestUpdateQty(it.product_id, 1) : dbUpdateQty(it.id, qty + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="text-end fw-bold" style={{ width: 140 }}>
                            {(price * qty).toFixed(2)} zł
                          </td>

                          <td className="text-end" style={{ width: 140 }}>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              type="button"
                              onClick={() => isGuest ? guestRemove(it.product_id) : dbRemove(it.id)}
                            >
                              Usuń
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
            <div className="fs-5">
              Suma: <strong>{total.toFixed(2)} zł</strong>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/checkout')}>
              Przejdź do zamówienia
            </button>
          </div>
        </>
      )}
    </div>
  );
}
