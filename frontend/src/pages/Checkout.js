import { useCallback, useEffect, useMemo, useState } from 'react';
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

function clearGuestCart() {
  localStorage.removeItem('guest_cart');
}

function shippingPrice(method) {
  const m = String(method || '').toLowerCase();
  const prices = { inpost: 14.99, dpd: 18.99, gls: 17.99, pocztapolska: 12.99 };
  return prices[m] ?? prices.inpost;
}

export default function Checkout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const isGuest = !token;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [shippingMethod, setShippingMethod] = useState('inpost');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // customer/address
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [country, setCountry] = useState('Polska');

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    setMsg('');
    try {
      if (isGuest) {
        setItems(loadGuestCart());
      } else {
        const [cartRes, meRes] = await Promise.all([
          API.get('/cart'),
          API.get('/users/me'),
        ]);
        setItems(Array.isArray(cartRes.data) ? cartRes.data : []);
        const me = meRes.data || {};
        setName(me.name || '');
        setEmail(me.email || '');
      }
    } catch (e) {
      setErr('Nie udało się załadować danych do zamówienia.');
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => { load(); }, [load]);

  const productsTotal = useMemo(() => {
    return items.reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);
  }, [items]);

  const shipPrice = useMemo(() => shippingPrice(shippingMethod), [shippingMethod]);
  const total = useMemo(() => productsTotal + shipPrice, [productsTotal, shipPrice]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');

    if (!items.length) {
      setErr('Koszyk jest pusty.');
      return;
    }

    const customer = {
      name,
      email,
      phone,
      address_line1: address1,
      address_line2: address2,
      city,
      postal_code: postal,
      country,
    };

    // minimalna walidacja po stronie frontu
    if (!customer.name || !customer.email || !customer.address_line1 || !customer.city || !customer.postal_code || !customer.country) {
      setErr('Uzupełnij wymagane dane adresowe.');
      return;
    }

    try {
      if (isGuest) {
        const payload = {
          shipping_method: shippingMethod,
          delivery_notes: deliveryNotes,
          customer,
          items: items.map(it => ({ product_id: it.product_id, quantity: Number(it.quantity || 0) })),
        };
        const res = await API.post('/orders/guest', payload);
        clearGuestCart();
        setMsg('Zamówienie złożone.');
        navigate(`/order-success/${res.data?.order?.id || ''}`);
      } else {
        const payload = {
          shipping_method: shippingMethod,
          delivery_notes: deliveryNotes,
          customer,
        };
        const res = await API.post('/orders', payload);
        setMsg('Zamówienie złożone.');
        navigate(`/order-success/${res.data?.order?.id || ''}`);
      }
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się złożyć zamówienia.');
    }
  };

  if (loading) return <div className="container mt-4">Ładowanie…</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <h2 className="mb-0">Zamówienie</h2>
        <span className="badge text-bg-secondary">{isGuest ? 'Gość' : 'Zalogowany'}</span>
      </div>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {err ? <div className="alert alert-danger">{err}</div> : null}

      {!items.length ? (
        <div className="alert alert-warning">
          Koszyk jest pusty. <button className="btn btn-link p-0" onClick={() => navigate('/products')}>Przejdź do produktów</button>
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-12 col-lg-7">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">Dane dostawy</h5>

                <form onSubmit={submit} className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Imię i nazwisko *</label>
                    <input className="form-control" value={name} onChange={(e)=>setName(e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-control" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Telefon</label>
                    <input className="form-control" value={phone} onChange={(e)=>setPhone(e.target.value)} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Adres (linia 1) *</label>
                    <input className="form-control" value={address1} onChange={(e)=>setAddress1(e.target.value)} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Adres (linia 2)</label>
                    <input className="form-control" value={address2} onChange={(e)=>setAddress2(e.target.value)} />
                  </div>

                  <div className="col-12 col-md-5">
                    <label className="form-label">Miasto *</label>
                    <input className="form-control" value={city} onChange={(e)=>setCity(e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label">Kod pocztowy *</label>
                    <input className="form-control" value={postal} onChange={(e)=>setPostal(e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Kraj *</label>
                    <input className="form-control" value={country} onChange={(e)=>setCountry(e.target.value)} required />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Kurier *</label>
                    <select className="form-select" value={shippingMethod} onChange={(e)=>setShippingMethod(e.target.value)}>
                      <option value="inpost">InPost</option>
                      <option value="dpd">DPD</option>
                      <option value="gls">GLS</option>
                      <option value="pocztapolska">Poczta Polska</option>
                    </select>
                    <div className="form-text">Koszt dostawy zostanie doliczony automatycznie.</div>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Uwagi do dostawy</label>
                    <textarea className="form-control" rows="2" value={deliveryNotes} onChange={(e)=>setDeliveryNotes(e.target.value)} />
                  </div>

                  <div className="col-12 d-flex gap-2">
                    <button className="btn btn-primary">Złóż zamówienie</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/cart')}>Wróć do koszyka</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">Podsumowanie</h5>

                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Produkt</th>
                        <th className="text-end">Suma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="fw-semibold">{it.name || `Produkt #${it.product_id}`}</div>
                            <div className="text-muted small">{Number(it.price||0).toFixed(2)} zł × {it.quantity}</div>
                          </td>
                          <td className="text-end fw-bold">{(Number(it.price||0) * Number(it.quantity||0)).toFixed(2)} zł</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <hr />
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Produkty</span>
                  <span className="fw-bold">{productsTotal.toFixed(2)} zł</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Dostawa ({shippingMethod})</span>
                  <span className="fw-bold">{shipPrice.toFixed(2)} zł</span>
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <span className="fs-5">Razem</span>
                  <span className="fs-5 fw-bold">{total.toFixed(2)} zł</span>
                </div>

                <div className="text-muted small mt-3">
                  Po złożeniu zamówienia dostaniesz potwierdzenie mailowe (jeśli SMTP jest skonfigurowane).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
