import React, { useEffect, useState } from 'react';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../../services/categories';

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await getCategories();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr('Nie udało się pobrać kategorii.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetAlerts = () => { setMsg(''); setErr(''); };

  const onCreate = async (e) => {
    e.preventDefault();
    resetAlerts();
    try {
      await createCategory({ name: newName, description: newDesc });
      setNewName('');
      setNewDesc('');
      setMsg('Kategoria dodana.');
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się dodać kategorii.');
    }
  };

  const beginEdit = (c) => {
    resetAlerts();
    setEditId(c.id);
    setEditName(c.name || '');
    setEditDesc(c.description || '');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditDesc('');
  };

  const onSave = async () => {
    resetAlerts();
    try {
      await updateCategory(editId, { name: editName, description: editDesc });
      setMsg('Kategoria zaktualizowana.');
      cancelEdit();
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się zapisać.');
    }
  };

  const onDelete = async (id) => {
    resetAlerts();
    if (!window.confirm('Usunąć kategorię?')) return;
    try {
      await deleteCategory(id);
      setMsg('Kategoria usunięta.');
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się usunąć.');
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-0">Admin: Kategorie</h2>
          <div className="text-muted small">Dodawanie, edycja i usuwanie kategorii.</div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>Odśwież</button>
      </div>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {err ? <div className="alert alert-danger">{err}</div> : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="mb-3">Dodaj kategorię</h5>
          <form onSubmit={onCreate} className="row g-2">
            <div className="col-12 col-md-4">
              <input className="form-control" placeholder="Nazwa" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <div className="col-12 col-md-6">
              <input className="form-control" placeholder="Opis (opcjonalnie)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div className="col-12 col-md-2">
              <button className="btn btn-primary w-100">Dodaj</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="mb-3">Lista kategorii</h5>

          {loading ? <div>Ładowanie…</div> : null}

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nazwa</th>
                  <th>Opis</th>
                  <th className="text-end">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td style={{ width: 260 }}>
                      {editId === c.id ? (
                        <input className="form-control form-control-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : (
                        <strong>{c.name}</strong>
                      )}
                    </td>
                    <td>
                      {editId === c.id ? (
                        <input className="form-control form-control-sm" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                      ) : (
                        <span className="text-muted small">{c.description || '—'}</span>
                      )}
                    </td>
                    <td className="text-end">
                      {editId === c.id ? (
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-success" type="button" onClick={onSave}>Zapisz</button>
                          <button className="btn btn-outline-secondary" type="button" onClick={cancelEdit}>Anuluj</button>
                        </div>
                      ) : (
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-dark" type="button" onClick={() => beginEdit(c)}>Edytuj</button>
                          <button className="btn btn-outline-danger" type="button" onClick={() => onDelete(c.id)}>Usuń</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 ? (
                  <tr><td colSpan="4" className="text-muted">Brak kategorii.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
