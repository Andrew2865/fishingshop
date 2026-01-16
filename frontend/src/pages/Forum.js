import React, { useEffect, useState } from 'react';
import { getPosts, createPost } from '../services/forum';
import { Link } from 'react-router-dom';

function imgSrc(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:5000${url}`;
}

export default function Forum() {
  const token = localStorage.getItem('token');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await getPosts();
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setErr('Nie udało się pobrać wpisów forum.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setErr('');
    try {
      await createPost({ title, content });
      setTitle('');
      setContent('');
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
          <div className="text-muted small">
            Goście mogą czytać, a wpisy dodają tylko zalogowani.
          </div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
          Odśwież
        </button>
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
                <input
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="Np. Jaka wędka na szczupaka?"
                />
              </div>
              <div className="col-12">
                <label className="form-label">Treść</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  placeholder="Opisz pytanie / poradę / temat..."
                />
              </div>
              <div className="col-12">
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? 'Dodawanie…' : 'Opublikuj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div>Ładowanie…</div> : null}

      <div className="d-grid gap-3">
        {posts.map((p) => (
          <div className="card shadow-sm" key={p.id}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-2">
                {p.avatar_url ? (
                  <img
                    src={imgSrc(p.avatar_url)}
                    alt={p.author_name}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="bg-light border" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                )}
                <div className="fw-semibold">{p.author_name}</div>
                <div className="text-muted small ms-auto">
                  {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                </div>
              </div>

              <h5 className="mb-2">
                <Link to={`/forum/${p.id}`} className="text-decoration-none">
                  {p.title}
                </Link>
              </h5>
              <div style={{ whiteSpace: 'pre-wrap' }}>{p.content}</div>
              <div className="mt-3">
                <Link to={`/forum/${p.id}`} className="btn btn-sm btn-outline-primary">
                  Otwórz dyskusję
                </Link>
              </div>
            </div>
          </div>
        ))}

        {!loading && posts.length === 0 ? (
          <div className="alert alert-secondary mb-0">Brak wpisów. Bądź pierwszą osobą, która coś napisze!</div>
        ) : null}
      </div>
    </div>
  );
}
