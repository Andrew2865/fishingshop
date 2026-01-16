import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/cart');
        return;
      }
      const res = await API.get('/cart');
      setItems(res.data);
    } catch (e) {
      setError('Nie udało się pobrać koszyka.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);
  }, [items]);

  const handleRemove = async (id) => {
    try {
      await API.delete(`/cart/${id}`);
      setItems(prev => prev.filter(x => x.id !== id));
    } catch {
      alert('Nie udało się usunąć pozycji.');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Koszyk</h2>
      {error ? <p style={{ color: 'red' }}>{error}</p> : null}

      {items.length === 0 ? (
        <p>Koszyk jest pusty.</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10 }}>
            {items.map(it => (
              <li key={it.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
                <div><strong>{it.name ?? `Produkt #${it.product_id}`}</strong></div>
                <div>Ilość: {it.quantity}</div>
                <div>Cena: {it.price ?? '-'} zł</div>
                <button onClick={() => handleRemove(it.id)} style={{ marginTop: 8 }}>Usuń</button>
              </li>
            ))}
          </ul>
          <h3 style={{ marginTop: 16 }}>Suma: {total.toFixed(2)} zł</h3>
          <p style={{ opacity: 0.7 }}>Checkout można dodać jako kolejny widok (tworzenie zamówienia przez /api/orders).</p>
        </>
      )}
    </div>
  );
}
