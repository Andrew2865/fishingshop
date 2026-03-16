import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getWarehouseOrders, updateWarehouseOrder } from '../../services/orders';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Oczekujące' },
  { value: 'processing', label: 'W realizacji' },
  { value: 'packed', label: 'Spakowane' },
  { value: 'shipped', label: 'Wysłane' },
  { value: 'completed', label: 'Zrealizowane' },
  { value: 'canceled', label: 'Anulowane' },
];

export default function WarehouseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await getWarehouseOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Nie udało się pobrać zamówień.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patchLocal = (id, patch) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const visibleOrders = useMemo(() => {
    if (!statusFilter) return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const saveOrder = async (order) => {
    setSavingId(order.id);
    setErr('');
    setMsg('');
    try {
      const res = await updateWarehouseOrder(order.id, {
        status: order.status,
        tracking_number: order.tracking_number || null,
      });
      patchLocal(order.id, res.data);
      setMsg(`Zamówienie #${order.id} zapisane.`);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Nie udało się zapisać zmian w zamówieniu.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-0">Magazyn: Zamówienia</h2>
          <div className="text-muted small">Pakowanie, wysyłka, anulowanie i obsługa numerów przesyłek.</div>
        </div>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Wszystkie statusy</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>Odśwież</button>
        </div>
      </div>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {err ? <div className="alert alert-danger">{err}</div> : null}

      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? <div>Ładowanie…</div> : null}
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Klient</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Tracking</th>
                  <th>Obsłużył</th>
                  <th className="text-end">Kwota</th>
                  <th className="text-end">Pozycje</th>
                  <th className="text-end">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>
                      <div className="fw-semibold">{o.customer_name || 'Brak danych'}</div>
                      <div className="text-muted small">{o.customer_email || '—'}</div>
                    </td>
                    <td>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</td>
                    <td style={{ minWidth: 180 }}>
                      <select className="form-select form-select-sm" value={o.status || 'pending'} onChange={(e) => patchLocal(o.id, { status: e.target.value })}>
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <input className="form-control form-control-sm" value={o.tracking_number || ''} onChange={(e) => patchLocal(o.id, { tracking_number: e.target.value })} placeholder="Numer śledzenia" />
                    </td>
                    <td>{o.handled_by_name || '—'}</td>
                    <td className="text-end fw-semibold">{Number(o.total_price || 0).toFixed(2)} zł</td>
                    <td className="text-end">{o.items_count || 0}</td>
                    <td className="text-end">
                      <button className="btn btn-primary btn-sm" onClick={() => saveOrder(o)} disabled={savingId === o.id}>
                        {savingId === o.id ? 'Zapisywanie…' : 'Zapisz'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && visibleOrders.length === 0 ? (
                  <tr><td colSpan="9" className="text-muted">Brak zamówień dla wybranego filtra.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
