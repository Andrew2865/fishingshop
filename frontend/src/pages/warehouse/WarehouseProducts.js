import React, { useCallback, useEffect, useState } from 'react';
import { getProductStockMovements, getProductsWarehouse, updateProductStock } from '../../services/products';
import { buildImageUrl } from '../../config';

export default function WarehouseProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [activeProductId, setActiveProductId] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await getProductsWarehouse();
      const items = Array.isArray(res.data) ? res.data : [];
      setProducts(items);
      setDrafts(Object.fromEntries(items.map((p) => [p.id, { change_quantity: '', movement_type: 'delivery', note: '' }])));
    } catch (e) {
      setErr(e?.response?.data?.error || 'Nie udało się pobrać produktów.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setDraft = (id, patch) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const saveStock = async (product) => {
    const draft = drafts[product.id] || {};
    setSavingId(product.id);
    setErr('');
    setMsg('');
    try {
      const res = await updateProductStock(product.id, {
        change_quantity: Number(draft.change_quantity || 0),
        movement_type: draft.movement_type || 'delivery',
        note: draft.note || '',
      });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? res.data : p)));
      setDraft(product.id, { change_quantity: '', movement_type: draft.movement_type || 'delivery', note: '' });
      setMsg(`Stan produktu „${product.name}” został zaktualizowany.`);
      if (activeProductId === product.id) {
        openMovements(product.id);
      }
    } catch (e) {
      setErr(e?.response?.data?.error || 'Nie udało się zapisać stanu magazynowego.');
    } finally {
      setSavingId(null);
    }
  };

  const openMovements = async (productId) => {
    setActiveProductId(productId);
    setMovementsLoading(true);
    try {
      const res = await getProductStockMovements(productId);
      setMovements(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setMovements([]);
      setErr(e?.response?.data?.error || 'Nie udało się pobrać historii ruchów magazynowych.');
    } finally {
      setMovementsLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-0">Magazyn: Produkty</h2>
          <div className="text-muted small">Dostawy, korekty stanów i historia ruchów magazynowych.</div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>Odśwież</button>
      </div>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {err ? <div className="alert alert-danger">{err}</div> : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          {loading ? <div>Ładowanie…</div> : null}
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produkt</th>
                  <th className="text-end">Stan</th>
                  <th>Zmiana</th>
                  <th>Typ</th>
                  <th>Notatka</th>
                  <th className="text-end">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const draft = drafts[p.id] || {};
                  return (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {p.image_url ? (
                            <img src={buildImageUrl(p.image_url)} alt={p.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} />
                          ) : (
                            <div className="bg-light border" style={{ width: 44, height: 44, borderRadius: 8 }} />
                          )}
                          <div>
                            <div className="fw-semibold">{p.name}</div>
                            <div className="text-muted small">{p.is_active ? 'Aktywny' : 'Wyłączony'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-end fw-bold">{p.stock}</td>
                      <td style={{ minWidth: 120 }}>
                        <input className="form-control form-control-sm" value={draft.change_quantity ?? ''} onChange={(e) => setDraft(p.id, { change_quantity: e.target.value })} placeholder="np. 10 / -2" />
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <select className="form-select form-select-sm" value={draft.movement_type || 'delivery'} onChange={(e) => setDraft(p.id, { movement_type: e.target.value })}>
                          <option value="delivery">Dostawa</option>
                          <option value="correction">Korekta</option>
                          <option value="manual">Ręczna zmiana</option>
                        </select>
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <input className="form-control form-control-sm" value={draft.note || ''} onChange={(e) => setDraft(p.id, { note: e.target.value })} placeholder="np. Dostawa od hurtowni" />
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <button className="btn btn-primary btn-sm" onClick={() => saveStock(p)} disabled={savingId === p.id}>
                            {savingId === p.id ? 'Zapisywanie…' : 'Zapisz'}
                          </button>
                          <button className="btn btn-outline-dark btn-sm" onClick={() => openMovements(p.id)}>
                            Historia
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && products.length === 0 ? (
                  <tr><td colSpan="7" className="text-muted">Brak produktów.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="mb-3">Historia ruchów magazynowych {activeProductId ? `dla produktu #${activeProductId}` : ''}</h5>
          {movementsLoading ? <div>Ładowanie historii…</div> : null}
          {!movementsLoading && activeProductId && movements.length === 0 ? <div className="text-muted">Brak zapisanych ruchów.</div> : null}
          {!activeProductId ? <div className="text-muted">Wybierz produkt i kliknij „Historia”.</div> : null}
          {!movementsLoading && movements.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Zmiana</th>
                    <th>Typ</th>
                    <th>Użytkownik</th>
                    <th>Notatka</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td>{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
                      <td className={Number(m.change_quantity) >= 0 ? 'text-success fw-semibold' : 'text-danger fw-semibold'}>
                        {Number(m.change_quantity) > 0 ? '+' : ''}{m.change_quantity}
                      </td>
                      <td>{m.movement_type}</td>
                      <td>{m.user_name || '—'}</td>
                      <td>{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
