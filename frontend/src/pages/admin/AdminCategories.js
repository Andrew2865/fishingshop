import React, { useEffect, useMemo, useState } from 'react';
import { buildImageUrl } from '../../config';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../../services/categories';

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImage, setNewImage] = useState(null);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [editImageUrl, setEditImageUrl] = useState('');

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

  const resetAlerts = () => {
    setMsg('');
    setErr('');
  };

  const newPreview = useMemo(() => (newImage ? URL.createObjectURL(newImage) : null), [newImage]);
  const editPreview = useMemo(() => (editImage ? URL.createObjectURL(editImage) : null), [editImage]);

  useEffect(() => () => {
    if (newPreview) URL.revokeObjectURL(newPreview);
  }, [newPreview]);

  useEffect(() => () => {
    if (editPreview) URL.revokeObjectURL(editPreview);
  }, [editPreview]);

  const onCreate = async (e) => {
    e.preventDefault();
    resetAlerts();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', newName);
      formData.append('description', newDesc);
      if (newImage) formData.append('image', newImage);

      await createCategory(formData);
      setNewName('');
      setNewDesc('');
      setNewImage(null);
      setMsg('Kategoria dodana.');
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się dodać kategorii.');
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (c) => {
    resetAlerts();
    setEditId(c.id);
    setEditName(c.name || '');
    setEditDesc(c.description || '');
    setEditImage(null);
    setEditImageUrl(c.image_url || '');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditDesc('');
    setEditImage(null);
    setEditImageUrl('');
  };

  const onSave = async () => {
    resetAlerts();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editName);
      formData.append('description', editDesc);
      if (editImage) {
        formData.append('image', editImage);
      } else if (editImageUrl === '') {
        formData.append('image_url', '');
      }

      await updateCategory(editId, formData);
      setMsg('Kategoria zaktualizowana.');
      cancelEdit();
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się zapisać.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    resetAlerts();
    if (!window.confirm('Usunąć kategorię?')) return;
    setSaving(true);
    try {
      await deleteCategory(id);
      setMsg('Kategoria usunięta.');
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się usunąć.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-0">Admin: Kategorie</h2>
          <div className="text-muted small">Dodawanie, edycja i usuwanie kategorii wraz ze zdjęciami.</div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading || saving}>Odśwież</button>
      </div>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {err ? <div className="alert alert-danger">{err}</div> : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="mb-3">Dodaj kategorię</h5>
          <form onSubmit={onCreate} className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label">Nazwa</label>
              <input className="form-control" placeholder="Nazwa" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Opis</label>
              <input className="form-control" placeholder="Opis (opcjonalnie)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Zdjęcie kategorii</label>
              <input className="form-control" type="file" accept="image/*" onChange={(e) => setNewImage(e.target.files?.[0] || null)} />
            </div>
            {newPreview ? (
              <div className="col-12">
                <img src={newPreview} alt="Podgląd nowej kategorii" style={{ maxWidth: 160, borderRadius: 8 }} />
              </div>
            ) : null}
            <div className="col-12 col-md-2">
              <button className="btn btn-primary w-100" disabled={saving}>{saving ? 'Zapisywanie…' : 'Dodaj'}</button>
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
                  <th>Zdjęcie</th>
                  <th>Nazwa</th>
                  <th>Opis</th>
                  <th className="text-end">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const currentImage = editId === c.id ? (editPreview || buildImageUrl(editImageUrl)) : buildImageUrl(c.image_url);
                  return (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td style={{ width: 110 }}>
                        {currentImage ? (
                          <img src={currentImage} alt={c.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                        ) : (
                          <span className="text-muted small">Brak</span>
                        )}
                      </td>
                      <td style={{ width: 240 }}>
                        {editId === c.id ? (
                          <input className="form-control form-control-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        ) : (
                          <strong>{c.name}</strong>
                        )}
                      </td>
                      <td style={{ minWidth: 240 }}>
                        {editId === c.id ? (
                          <div className="d-flex flex-column gap-2">
                            <input className="form-control form-control-sm" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                            <input className="form-control form-control-sm" type="file" accept="image/*" onChange={(e) => setEditImage(e.target.files?.[0] || null)} />
                            {editImageUrl ? (
                              <button type="button" className="btn btn-outline-danger btn-sm align-self-start" onClick={() => { setEditImage(null); setEditImageUrl(''); }}>
                                Usuń obecne zdjęcie
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted small">{c.description || '—'}</span>
                        )}
                      </td>
                      <td className="text-end">
                        {editId === c.id ? (
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-success" type="button" onClick={onSave} disabled={saving}>Zapisz</button>
                            <button className="btn btn-outline-secondary" type="button" onClick={cancelEdit} disabled={saving}>Anuluj</button>
                          </div>
                        ) : (
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-dark" type="button" onClick={() => beginEdit(c)} disabled={saving}>Edytuj</button>
                            <button className="btn btn-outline-danger" type="button" onClick={() => onDelete(c.id)} disabled={saving}>Usuń</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && items.length === 0 ? (
                  <tr><td colSpan="5" className="text-muted">Brak kategorii.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
