import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createProduct, deleteProduct, getProductsAdmin, updateProduct, uploadProductImage, uploadProductGalleryImages, deleteProductGalleryImage } from '../../services/products';
import { getCategories } from '../../services/categories';

import { buildImageUrl } from '../../config';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [nName, setNName] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nPrice, setNPrice] = useState('');
  const [nOldPrice, setNOldPrice] = useState('');
  const [nStock, setNStock] = useState(0);
  const [nCategoryId, setNCategoryId] = useState('');
  const [nFeatured, setNFeatured] = useState(false);
  const [nPromo, setNPromo] = useState(false);
  const [nActive, setNActive] = useState(true);

  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const resetAlerts = () => { setMsg(''); setErr(''); };

  const load = useCallback(async () => {
  setLoading(true);
  resetAlerts();
  try {
    const [pRes, cRes] = await Promise.all([getProductsAdmin(), getCategories()]);
    setProducts(Array.isArray(pRes.data) ? pRes.data : []);
    setCategories(Array.isArray(cRes.data) ? cRes.data : []);
  } catch (e) {
    setErr('Nie udało się pobrać produktów / kategorii.');
  } finally {
    setLoading(false);
  }

}, []);


  useEffect(() => { load(); }, [load]);

  const catMap = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const beginEdit = (p) => {
    resetAlerts();
    setEditId(p.id);
    setForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price ?? '',
      old_price: p.old_price ?? '',
      stock: p.stock ?? 0,
      category_id: p.category_id ?? '',
      is_featured: !!p.is_featured,
      is_promo: !!p.is_promo,
      is_active: p.is_active === undefined ? true : !!p.is_active,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({});
    setUploadFile(null);
    setGalleryFiles([]);
    setUploadingId(null);
  };

  const onSave = async () => {
    resetAlerts();
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        old_price: form.old_price === '' ? null : Number(form.old_price),
        stock: Number(form.stock),
        category_id: form.category_id === '' ? null : Number(form.category_id),
      };
      await updateProduct(editId, payload);
      setMsg('Produkt zaktualizowany.');
      cancelEdit();
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się zapisać produktu.');
    }
  };

  const onDelete = async (id) => {
    resetAlerts();
    if (!window.confirm('Usunąć produkt?')) return;
    try {
      await deleteProduct(id);
      setMsg('Produkt usunięty.');
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się usunąć produktu.');
    }
  };

  const onCreate = async (e) => {
    e.preventDefault();
    resetAlerts();
    try {
      const payload = {
        name: nName,
        description: nDesc,
        price: Number(nPrice),
        old_price: nOldPrice === '' ? null : Number(nOldPrice),
        stock: Number(nStock),
        category_id: nCategoryId === '' ? null : Number(nCategoryId),
        is_featured: !!nFeatured,
        is_promo: !!nPromo,
        is_active: !!nActive,
      };
      await createProduct(payload);
      setMsg('Produkt dodany.');
      setNName(''); setNDesc(''); setNPrice(''); setNOldPrice(''); setNStock(0); setNCategoryId('');
      setNFeatured(false); setNPromo(false); setNActive(true);
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się dodać produktu.');
    }
  };

  const onUpload = async () => {
    resetAlerts();
    if (!uploadFile || !editId) return setErr('Wybierz plik i produkt.');
    setUploadingId(editId);
    try {
      await uploadProductImage(editId, uploadFile);
      setMsg('Zdjęcie produktu wgrane.');
      setUploadFile(null);
      setUploadingId(null);
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się wgrać zdjęcia.');
      setUploadingId(null);
    }
  };
  const onGalleryUpload = async () => {
    resetAlerts();
    if (!galleryFiles.length || !editId) return setErr('Wybierz zdjęcia galerii i produkt.');
    setUploadingId(editId);
    try {
      await uploadProductGalleryImages(editId, galleryFiles);
      setMsg('Zdjęcia galerii dodane.');
      setGalleryFiles([]);
      setUploadingId(null);
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się wgrać galerii.');
      setUploadingId(null);
    }
  };

  const onDeleteGalleryImage = async (productId, imageId) => {
    resetAlerts();
    if (!window.confirm('Usunąć zdjęcie z galerii?')) return;
    try {
      await deleteProductGalleryImage(productId, imageId);
      setMsg('Zdjęcie galerii usunięte.');
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się usunąć zdjęcia galerii.');
    }
  };


  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-0">Admin: Produkty</h2>
          <div className="text-muted small">Dodawanie, edycja, usuwanie, promocje oraz zdjęcia produktów.</div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>Odśwież</button>
      </div>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {err ? <div className="alert alert-danger">{err}</div> : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="mb-3">Dodaj produkt</h5>
          <form onSubmit={onCreate} className="row g-2">
            <div className="col-12 col-lg-4">
              <input className="form-control" placeholder="Nazwa" value={nName} onChange={(e) => setNName(e.target.value)} required />
            </div>
            <div className="col-12 col-lg-6">
              <input className="form-control" placeholder="Opis" value={nDesc} onChange={(e) => setNDesc(e.target.value)} />
            </div>
            <div className="col-6 col-lg-2">
              <input className="form-control" placeholder="Cena" value={nPrice} onChange={(e) => setNPrice(e.target.value)} required />
            </div>

            <div className="col-6 col-lg-2">
              <input className="form-control" placeholder="Stara cena" value={nOldPrice} onChange={(e) => setNOldPrice(e.target.value)} />
            </div>
            <div className="col-6 col-lg-2">
              <input className="form-control" placeholder="Stan" value={nStock} onChange={(e) => setNStock(e.target.value)} />
            </div>
            <div className="col-12 col-lg-3">
              <select className="form-select" value={nCategoryId} onChange={(e) => setNCategoryId(e.target.value)}>
                <option value="">Kategoria (opcjonalnie)</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="col-12 col-lg-5 d-flex align-items-center gap-3 flex-wrap">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={nFeatured} onChange={(e) => setNFeatured(e.target.checked)} id="nFeatured" />
                <label className="form-check-label" htmlFor="nFeatured">Wyróżniony</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={nPromo} onChange={(e) => setNPromo(e.target.checked)} id="nPromo" />
                <label className="form-check-label" htmlFor="nPromo">Promocja</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={nActive} onChange={(e) => setNActive(e.target.checked)} id="nActive" />
                <label className="form-check-label" htmlFor="nActive">Aktywny</label>
              </div>
              <button className="btn btn-primary ms-auto">Dodaj</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="mb-3">Lista produktów</h5>
          {loading ? <div>Ładowanie…</div> : null}

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produkt</th>
                  <th>Kategoria</th>
                  <th className="text-end">Cena</th>
                  <th className="text-end">Stara</th>
                  <th className="text-end">Stan</th>
                  <th>Flagi</th>
                  <th className="text-end">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>

                    <td style={{ minWidth: 320 }}>
                      <div className="d-flex align-items-center gap-2">
                        {p.image_url ? (
                          <img
                            src={buildImageUrl(p.image_url)}
                            alt={p.name}
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }}
                          />
                        ) : (
                          <div className="bg-light border" style={{ width: 44, height: 44, borderRadius: 8 }} />
                        )}

                        <div className="w-100">
                          {editId === p.id ? (
                            <>
                              <input className="form-control form-control-sm mb-1"
                                value={form.name}
                                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                              />
                              <input className="form-control form-control-sm"
                                value={form.description}
                                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                                placeholder="Opis"
                              />
                            </>
                          ) : (
                            <>
                              <div className="fw-semibold">{p.name}</div>
                              <div className="text-muted small">{p.description || '—'}</div>
                            </>
                          )}
                        </div>
                      </div>

                      {editId === p.id ? (
                        <div className="mt-2">
                          <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                            <input
                              type="file"
                              className="form-control form-control-sm"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                              style={{ maxWidth: 260 }}
                            />
                            <button className="btn btn-outline-dark btn-sm" type="button" onClick={onUpload} disabled={uploadingId === p.id}>
                              {uploadingId === p.id ? 'Wgrywanie…' : 'Wgraj zdjęcie główne'}
                            </button>
                          </div>

                          <div className="small text-muted mb-1">Galeria produktu</div>
                          <div className="d-flex gap-2 flex-wrap mb-2">
                            {Array.isArray(p.images) && p.images.filter((img) => !img.is_main).length > 0 ? p.images.filter((img) => !img.is_main).map((img) => (
                              <div key={img.id} className="position-relative">
                                <img src={buildImageUrl(img.image_url)} alt={p.name} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8 }} />
                                <button type="button" className="btn btn-danger btn-sm position-absolute top-0 end-0 translate-middle p-0" style={{ width: 20, height: 20, lineHeight: '18px' }} onClick={() => onDeleteGalleryImage(p.id, img.id)}>×</button>
                              </div>
                            )) : <span className="text-muted small">Brak dodatkowych zdjęć</span>}
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <input
                              type="file"
                              multiple
                              className="form-control form-control-sm"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
                              style={{ maxWidth: 320 }}
                            />
                            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onGalleryUpload} disabled={uploadingId === p.id}>
                              {uploadingId === p.id ? 'Wgrywanie…' : 'Dodaj do galerii'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </td>

                    <td style={{ minWidth: 200 }}>
                      {editId === p.id ? (
                        <select
                          className="form-select form-select-sm"
                          value={form.category_id}
                          onChange={(e) => setForm((s) => ({ ...s, category_id: e.target.value }))}
                        >
                          <option value="">Brak</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-muted">{catMap.get(p.category_id) || '—'}</span>
                      )}
                    </td>

                    <td className="text-end" style={{ minWidth: 110 }}>
                      {editId === p.id ? (
                        <input className="form-control form-control-sm text-end" value={form.price}
                          onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                        />
                      ) : (
                        <strong>{Number(p.price).toFixed(2)} zł</strong>
                      )}
                    </td>

                    <td className="text-end" style={{ minWidth: 110 }}>
                      {editId === p.id ? (
                        <input className="form-control form-control-sm text-end" value={form.old_price}
                          onChange={(e) => setForm((s) => ({ ...s, old_price: e.target.value }))}
                        />
                      ) : (
                        <span className="text-muted">{p.old_price ? `${Number(p.old_price).toFixed(2)} zł` : '—'}</span>
                      )}
                    </td>

                    <td className="text-end" style={{ minWidth: 90 }}>
                      {editId === p.id ? (
                        <input className="form-control form-control-sm text-end" value={form.stock}
                          onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value }))}
                        />
                      ) : (
                        p.stock
                      )}
                    </td>

                    <td style={{ minWidth: 170 }}>
                      {editId === p.id ? (
                        <div className="d-flex gap-2 flex-wrap">
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" checked={form.is_featured}
                              onChange={(e) => setForm((s) => ({ ...s, is_featured: e.target.checked }))}
                              id={`feat_${p.id}`}
                            />
                            <label className="form-check-label small" htmlFor={`feat_${p.id}`}>Wyróżniony</label>
                          </div>
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" checked={form.is_promo}
                              onChange={(e) => setForm((s) => ({ ...s, is_promo: e.target.checked }))}
                              id={`promo_${p.id}`}
                            />
                            <label className="form-check-label small" htmlFor={`promo_${p.id}`}>Promocja</label>
                          </div>
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" checked={form.is_active}
                              onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
                              id={`active_${p.id}`}
                            />
                            <label className="form-check-label small" htmlFor={`active_${p.id}`}>Aktywny</label>
                          </div>
                        </div>
                      ) : (
                        <div className="d-flex gap-2 flex-wrap">
                          {p.is_featured ? <span className="badge text-bg-primary">Wyróżniony</span> : null}
                          {p.is_promo ? <span className="badge text-bg-warning">Promo</span> : null}
                          {p.is_active ? <span className="badge text-bg-success">Aktywny</span> : <span className="badge text-bg-secondary">Nieaktywny</span>}
                        </div>
                      )}
                    </td>

                    <td className="text-end" style={{ minWidth: 190 }}>
                      {editId === p.id ? (
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-success" type="button" onClick={onSave}>Zapisz</button>
                          <button className="btn btn-outline-secondary" type="button" onClick={cancelEdit}>Anuluj</button>
                        </div>
                      ) : (
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-dark" type="button" onClick={() => beginEdit(p)}>
                            Edytuj
                          </button>
                          <button className="btn btn-outline-danger" type="button" onClick={() => onDelete(p.id)}>
                            Usuń
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && products.length === 0 ? (
            <div className="alert alert-secondary mb-0">Brak produktów.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
