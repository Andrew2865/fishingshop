import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPost, getComments, createComment } from '../services/forum';

function imgSrc(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:5000${url}`;
}

export default function ForumPost() {
  const { id } = useParams();
  const token = localStorage.getItem('token');

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([getPost(id), getComments(id)]);
      setPost(pRes.data);
      setComments(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Nie udało się wczytać wpisu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setErr('');
    try {
      await createComment(id, { content });
      setContent('');
      const cRes = await getComments(id);
      setComments(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się dodać komentarza.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <Link to="/forum" className="btn btn-link p-0 mb-3">← Wróć do forum</Link>
        <div>Ładowanie…</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mt-4">
        <Link to="/forum" className="btn btn-link p-0 mb-3">← Wróć do forum</Link>
        <div className="alert alert-warning">{err || 'Nie znaleziono wpisu.'}</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <Link to="/forum" className="btn btn-link p-0">← Wróć do forum</Link>
          <h2 className="mb-0 mt-2">{post.title}</h2>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load}>
          Odśwież
        </button>
      </div>

      {err ? <div className="alert alert-warning">{err}</div> : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-2">
            {post.avatar_url ? (
              <img
                src={imgSrc(post.avatar_url)}
                alt={post.author_name}
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div className="bg-light border" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            )}
            <div className="fw-semibold">{post.author_name}</div>
            <div className="text-muted small ms-auto">
              {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
            </div>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{post.content}</div>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="mb-3">Komentarze ({comments.length})</h5>

          {!token ? (
            <div className="alert alert-info mb-3">
              Aby dodać komentarz, musisz się zalogować. <Link to="/login">Przejdź do logowania</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="row g-2 mb-3">
              <div className="col-12">
                <textarea
                  className="form-control"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  placeholder="Napisz komentarz…"
                />
              </div>
              <div className="col-12">
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? 'Dodawanie…' : 'Dodaj komentarz'}
                </button>
              </div>
            </form>
          )}

          <div className="d-grid gap-3">
            {comments.map((c) => (
              <div key={c.id} className="border rounded p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  {c.avatar_url ? (
                    <img
                      src={imgSrc(c.avatar_url)}
                      alt={c.author_name}
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="bg-light border" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  )}
                  <div className="fw-semibold">{c.author_name}</div>
                  <div className="text-muted small ms-auto">
                    {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                  </div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
              </div>
            ))}

            {comments.length === 0 ? (
              <div className="alert alert-secondary mb-0">Brak komentarzy. Rozpocznij dyskusję jako pierwszy!</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
