import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getPosts, createPost } from '../services/forum';
import { Link, useSearchParams } from 'react-router-dom';
import { buildImageUrl } from '../config';

const PAGE_SIZE = 8;
const MAX_FILES = 4;

export default function Forum() {
  const token = localStorage.getItem('token');
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);

  const page = Number(searchParams.get('page') || '1');
  const query = searchParams.get('q') || '';

  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images]
  );

  useEffect(() => () => {
    previews.forEach((item) => URL.revokeObjectURL(item.url));
  }, [previews]);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await getPosts({ page, page_size: PAGE_SIZE, q: query.trim() || undefined });
      setPosts(Array.isArray(res.data?.items) ? res.data.items : []);
      setPagination(res.data?.pagination || null);
    } catch {
      setErr('Nie udało się pobrać wpisów forum.');
      setPosts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { load(); }, [load]);

  const setParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (!value) params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const handleFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > MAX_FILES) {
      setErr(`Możesz dodać maksymalnie ${MAX_FILES} zdjęcia.`);
      setImages(selected.slice(0, MAX_FILES));
      return;
    }
    setErr('');
    setImages(selected);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setErr('');
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      images.forEach((file) => formData.append('images', file));

      await createPost(formData);
      setTitle('');
      setContent('');
      setImages([]);
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się dodać wpisu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-0">Forum wędkarskie</h2>
          <div className="text-muted small">Goście mogą czytać, a wpisy dodają tylko zalogowani.</div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>Odśwież</button>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body row g-2 align-items-end">
          <div className="col-12 col-md-8">
            <label className="form-label">Szukaj tematów</label>
            <input
              className="form-control"
              value={query}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Np. feeder, szczupak, jezioro..."
            />
          </div>
          <div className="col-12 col-md-4">
            <button className="btn btn-outline-secondary w-100" onClick={() => setSearchParams(new URLSearchParams())}>
              Wyczyść wyszukiwanie
            </button>
          </div>
        </div>
      </div>

      {err ? <div className="alert alert-warning">{err}</div> : null}

      {!token ? (
        <div className="alert alert-info">
          Aby dodać wpis, musisz się zalogować. <Link to="/login">Przejdź do logowania</Link>
        </div>
      ) : (
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <h5 className="mb-3">Dodaj wpis</h5>
            <form onSubmit={onSubmit} className="row g-3">
              <div className="col-12">
                <label className="form-label">Tytuł</label>
                <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="Np. Jaka wędka na szczupaka?" />
              </div>
              <div className="col-12">
                <label className="form-label">Treść</label>
                <textarea className="form-control" rows={4} value={content} onChange={(e) => setContent(e.target.value)} required placeholder="Opisz pytanie / poradę / temat..." />
              </div>
              <div className="col-12">
                <label className="form-label d-block">Zdjęcia</label>
                <label className="btn btn-outline-primary">
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleFilesChange} />
                  + Dodaj zdjęcia ryby / zestawu
                </label>
                <div className="form-text">Możesz dodać do 4 zdjęć (PNG, JPG, WEBP, maks. 5 MB każde).</div>
              </div>

              {previews.length > 0 ? (
                <div className="col-12">
                  <div className="row g-3">
                    {previews.map((item, index) => (
                      <div className="col-6 col-md-3" key={`${item.file.name}-${index}`}>
                        <div className="card h-100">
                          <img src={item.url} alt={item.file.name} className="card-img-top" style={{ height: 160, objectFit: 'cover' }} />
                          <div className="card-body p-2">
                            <div className="small text-truncate mb-2">{item.file.name}</div>
                            <button type="button" className="btn btn-sm btn-outline-danger w-100" onClick={() => removeImage(index)}>Usuń</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="col-12">
                <button className="btn btn-primary" disabled={saving}>{saving ? 'Dodawanie…' : 'Opublikuj'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="alert alert-light border">Ładowanie wpisów…</div> : null}

      <div className="d-grid gap-3">
        {posts.map((p) => (
          <div className="card shadow-sm" key={p.id}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-2">
                {p.avatar_url ? (
                  <img src={buildImageUrl(p.avatar_url)} alt={p.author_name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="bg-light border" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                )}
                <div className="fw-semibold">{p.author_name}</div>
                <div className="text-muted small ms-auto">{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</div>
              </div>

              <h5 className="mb-2"><Link to={`/forum/${p.id}`} className="text-decoration-none">{p.title}</Link></h5>
              <div style={{ whiteSpace: 'pre-wrap' }}>{p.content}</div>

              {Array.isArray(p.images) && p.images.length > 0 ? (
                <div className="row g-2 mt-2">
                  {p.images.slice(0, 4).map((img, index) => (
                    <div className="col-6 col-md-3" key={`${p.id}-${index}`}>
                      <img src={buildImageUrl(img)} alt={`Zdjęcie wpisu ${p.title}`} className="img-fluid rounded border" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3"><Link to={`/forum/${p.id}`} className="btn btn-sm btn-outline-primary">Otwórz dyskusję</Link></div>
            </div>
          </div>
        ))}

        {!loading && posts.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            {query ? 'Brak wpisów pasujących do wyszukiwania.' : 'Brak wpisów. Bądź pierwszą osobą, która coś napisze!'}
          </div>
        ) : null}
      </div>

      {!loading && pagination && pagination.total_pages > 1 ? (
        <div className="d-flex align-items-center justify-content-between mt-4 flex-wrap gap-2">
          <div className="text-muted small">Strona {pagination.page} z {pagination.total_pages}</div>
          <div className="btn-group">
            <button className="btn btn-outline-secondary btn-sm" disabled={!pagination.has_prev} onClick={() => setParam('page', String(pagination.page - 1))}>← Poprzednia</button>
            <button className="btn btn-outline-secondary btn-sm" disabled={!pagination.has_next} onClick={() => setParam('page', String(pagination.page + 1))}>Następna →</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
