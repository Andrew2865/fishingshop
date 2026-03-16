import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPost, getComments, createComment } from '../services/forum';
import { buildImageUrl } from '../config';

export default function ForumPost() {
  const { id } = useParams();
  const token = localStorage.getItem('token');

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [activeImage, setActiveImage] = useState('');

  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);

  const previews = useMemo(() => images.map((file) => ({ file, url: URL.createObjectURL(file) })), [images]);

  useEffect(() => () => {
    previews.forEach((item) => URL.revokeObjectURL(item.url));
  }, [previews]);

  const load = useCallback(async () => {
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
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 4) {
      setErr('Możesz dodać maksymalnie 4 zdjęcia do komentarza.');
      setImages(selected.slice(0, 4));
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
      formData.append('content', content);
      images.forEach((file) => formData.append('images', file));

      await createComment(id, formData);
      setContent('');
      setImages([]);
      const cRes = await getComments(id);
      setComments(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się dodać komentarza.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mt-4"><Link to="/forum" className="btn btn-link p-0 mb-3">← Wróć do forum</Link><div className="alert alert-light border">Ładowanie wpisu…</div></div>;
  }

  if (!post) {
    return <div className="container mt-4"><Link to="/forum" className="btn btn-link p-0 mb-3">← Wróć do forum</Link><div className="alert alert-warning">{err || 'Nie znaleziono wpisu.'}</div></div>;
  }

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <Link to="/forum" className="btn btn-link p-0">← Wróć do forum</Link>
          <h2 className="mb-0 mt-2">{post.title}</h2>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={load}>Odśwież</button>
      </div>

      {err ? <div className="alert alert-warning">{err}</div> : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-2">
            {post.avatar_url ? <img src={buildImageUrl(post.avatar_url)} alt={post.author_name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : <div className="bg-light border" style={{ width: 36, height: 36, borderRadius: '50%' }} />}
            <div className="fw-semibold">{post.author_name}</div>
            <div className="text-muted small ms-auto">{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</div>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{post.content}</div>

          {Array.isArray(post.images) && post.images.length > 0 ? (
            <div className="mt-3">
              <div className="row g-3">
                {post.images.map((img, index) => (
                  <div className="col-6 col-md-4" key={`${post.id}-${index}`}>
                    <button type="button" className="btn p-0 border w-100" onClick={() => setActiveImage(buildImageUrl(img))}>
                      <img src={buildImageUrl(img)} alt={`Zdjęcie ${index + 1}`} className="img-fluid rounded" style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {activeImage ? (
        <div className="modal d-block" tabIndex="-1" role="dialog" onClick={() => setActiveImage('')} style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Podgląd zdjęcia</h5>
                <button type="button" className="btn-close" onClick={() => setActiveImage('')} />
              </div>
              <div className="modal-body text-center">
                <img src={activeImage} alt="Podgląd" className="img-fluid rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="mb-3">Komentarze ({comments.length})</h5>

          {!token ? (
            <div className="alert alert-info mb-3">Aby dodać komentarz, musisz się zalogować. <Link to="/login">Przejdź do logowania</Link></div>
          ) : (
            <form onSubmit={onSubmit} className="row g-2 mb-3">
              <div className="col-12"><textarea className="form-control" rows={3} value={content} onChange={(e) => setContent(e.target.value)} required placeholder="Napisz komentarz…" /></div>
              <div className="col-12">
                <label className="form-label fw-semibold">Dodaj zdjęcia do komentarza</label>
                <input type="file" className="form-control" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFilesChange} />
                <div className="form-text">Możesz dodać maksymalnie 4 zdjęcia ryby, zestawu lub łowiska.</div>
              </div>

              {previews.length > 0 ? (
                <div className="col-12">
                  <div className="row g-2">
                    {previews.map((item, index) => (
                      <div className="col-6 col-md-3" key={`${item.file.name}-${index}`}>
                        <div className="border rounded p-2 h-100">
                          <img src={item.url} alt={item.file.name} className="img-fluid rounded mb-2" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                          <button type="button" className="btn btn-sm btn-outline-danger w-100" onClick={() => removeImage(index)}>Usuń zdjęcie</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="col-12"><button className="btn btn-primary" disabled={saving}>{saving ? 'Dodawanie…' : 'Dodaj komentarz'}</button></div>
            </form>
          )}

          <div className="d-grid gap-3">
            {comments.map((c) => (
              <div key={c.id} className="border rounded p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  {c.avatar_url ? <img src={buildImageUrl(c.avatar_url)} alt={c.author_name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <div className="bg-light border" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
                  <div className="fw-semibold">{c.author_name}</div>
                  <div className="text-muted small ms-auto">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>

                {Array.isArray(c.images) && c.images.length > 0 ? (
                  <div className="row g-2 mt-2">
                    {c.images.map((img, index) => (
                      <div className="col-6 col-md-3" key={`${c.id}-${index}`}>
                        <button type="button" className="btn p-0 border w-100" onClick={() => setActiveImage(buildImageUrl(img))}>
                          <img src={buildImageUrl(img)} alt={`Zdjęcie komentarza ${index + 1}`} className="img-fluid rounded" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {comments.length === 0 ? <div className="alert alert-secondary mb-0">Brak komentarzy. Rozpocznij dyskusję jako pierwszy!</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
