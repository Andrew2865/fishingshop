import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buildImageUrl } from '../config';
import { getCategories } from '../services/categories';
import { addOrUpdateProductReview, getProduct, getProducts } from '../services/products';
import API from '../services/api';

function saveGuestCartItem(product, quantity) {
  const safeQty = Math.max(Number(quantity) || 1, 1);
  try {
    const raw = localStorage.getItem('guest_cart');
    const cart = JSON.parse(raw || '[]');
    const items = Array.isArray(cart) ? cart : [];
    const idx = items.findIndex((i) => Number(i.product_id) === Number(product.id));

    if (idx >= 0) {
      items[idx].quantity = Number(items[idx].quantity || 0) + safeQty;
    } else {
      items.push({
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: safeQty,
      });
    }

    localStorage.setItem('guest_cart', JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function Price({ price, oldPrice }) {
  const current = Number(price || 0).toFixed(2);
  if (!oldPrice) return <span className="fs-4 fw-bold">{current} zł</span>;

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <span className="text-muted text-decoration-line-through">{Number(oldPrice).toFixed(2)} zł</span>
      <span className="fs-4 fw-bold text-danger">{current} zł</span>
    </div>
  );
}

function Stars({ value = 0, muted = false }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className={muted ? 'text-muted' : 'text-warning'}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>{star <= rounded ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setReviewMessage('');

    try {
      const [productRes, categoriesRes] = await Promise.all([
        getProduct(id),
        getCategories(),
      ]);

      const loadedProduct = productRes.data;
      setProduct(loadedProduct);
      const firstImage = loadedProduct?.images?.[0]?.image_url || loadedProduct?.image_url || null;
      setSelectedImage(firstImage);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);

      if (loadedProduct?.category_id) {
        const relatedRes = await getProducts({
          category_id: loadedProduct.category_id,
          page: 1,
          page_size: 4,
          sort: 'newest',
        });

        const items = Array.isArray(relatedRes.data?.items)
          ? relatedRes.data.items
          : Array.isArray(relatedRes.data)
            ? relatedRes.data
            : [];

        setRelated(items.filter((item) => Number(item.id) !== Number(loadedProduct.id)).slice(0, 4));
      } else {
        setRelated([]);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Nie udało się pobrać szczegółów produktu.');
      setProduct(null);
      setRelated([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const category = useMemo(() => {
    if (!product?.category_id) return null;
    return categories.find((item) => Number(item.id) === Number(product.category_id)) || null;
  }, [categories, product]);

  const images = useMemo(() => {
    const gallery = Array.isArray(product?.images) ? product.images : [];
    if (gallery.length > 0) return gallery;
    return product?.image_url ? [{ id: `main-${product.id}`, image_url: product.image_url, is_main: true }] : [];
  }, [product]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, [product]);

  const userReview = useMemo(() => {
    const reviews = Array.isArray(product?.reviews?.items) ? product.reviews.items : [];
    if (!user?.id) return null;
    return reviews.find((item) => Number(item.user_id) === Number(user.id)) || null;
  }, [product, user]);

  useEffect(() => {
    if (userReview) {
      setReviewRating(Number(userReview.rating) || 5);
      setReviewComment(userReview.comment || '');
    } else {
      setReviewRating(5);
      setReviewComment('');
    }
  }, [userReview]);

  const handleAddToCart = async () => {
    if (!product) return;

    const qty = Math.max(1, Math.min(Number(quantity) || 1, Number(product.stock || 0) || 1));
    const token = localStorage.getItem('token');
    setAdding(true);
    setMessage('');

    try {
      if (token) {
        await API.post('/cart', { product_id: product.id, quantity: qty });
      } else {
        const ok = saveGuestCartItem(product, qty);
        if (!ok) throw new Error('Nie udało się zapisać koszyka gościa.');
      }

      setMessage('Produkt został dodany do koszyka.');
    } catch (e) {
      setMessage(e?.response?.data?.error || e?.message || 'Nie udało się dodać produktu do koszyka.');
    } finally {
      setAdding(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setReviewMessage('Zaloguj się, aby dodać opinię.');
      return;
    }

    setReviewSaving(true);
    setReviewMessage('');
    try {
      const res = await addOrUpdateProductReview(id, {
        rating: Number(reviewRating),
        comment: reviewComment,
      });
      setProduct((prev) => ({ ...prev, reviews: res.data.reviews }));
      setReviewMessage(userReview ? 'Opinia została zaktualizowana.' : 'Dziękujemy za opinię!');
    } catch (e2) {
      setReviewMessage(e2?.response?.data?.error || 'Nie udało się zapisać opinii.');
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading) {
    return <div className="container mt-4"><div className="alert alert-light border">Ładowanie karty produktu…</div></div>;
  }

  if (error || !product) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">{error || 'Produkt nie został znaleziony.'}</div>
        <Link to="/products" className="btn btn-outline-primary">Wróć do produktów</Link>
      </div>
    );
  }

  const stock = Number(product.stock || 0);
  const safeQty = Math.max(1, Math.min(Number(quantity) || 1, stock || 1));
  const currentPreview = selectedImage || images[0]?.image_url || product.image_url;
  const reviews = Array.isArray(product?.reviews?.items) ? product.reviews.items : [];

  return (
    <div className="container mt-4 pb-4">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/">Start</Link></li>
          <li className="breadcrumb-item"><Link to="/products">Produkty</Link></li>
          {category ? (
            <li className="breadcrumb-item">
              <Link to={`/products?category_id=${category.id}`}>{category.name}</Link>
            </li>
          ) : null}
          <li className="breadcrumb-item active" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      {message ? <div className={`alert ${message.includes('dodany') ? 'alert-success' : 'alert-warning'}`}>{message}</div> : null}

      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm overflow-hidden mb-3">
            {currentPreview ? (
              <img
                src={buildImageUrl(currentPreview)}
                alt={product.name}
                className="img-fluid"
                style={{ width: '100%', maxHeight: 520, objectFit: 'cover' }}
              />
            ) : (
              <div className="bg-light d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 420 }}>
                Brak zdjęcia produktu
              </div>
            )}
          </div>

          {images.length > 1 ? (
            <div className="d-flex gap-2 flex-wrap">
              {images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  className={`btn p-0 border ${currentPreview === image.image_url ? 'border-primary border-2' : 'border-light'}`}
                  onClick={() => setSelectedImage(image.image_url)}
                  style={{ borderRadius: 12, overflow: 'hidden' }}
                >
                  <img
                    src={buildImageUrl(image.image_url)}
                    alt={product.name}
                    style={{ width: 82, height: 82, objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-12 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              {product.is_promo ? <span className="badge text-bg-danger mb-2">Promocja</span> : null}
              <h1 className="h2 mb-2">{product.name}</h1>

              <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <Stars value={product?.reviews?.avg_rating || 0} />
                <span className="fw-semibold">{Number(product?.reviews?.avg_rating || 0).toFixed(1)}/5</span>
                <span className="text-muted">({product?.reviews?.review_count || 0} opinii)</span>
              </div>

              <Price price={product.price} oldPrice={product.old_price} />

              <div className="d-flex flex-wrap gap-2 mt-3 mb-3">
                <span className={`badge ${stock > 0 ? 'text-bg-success' : 'text-bg-secondary'}`}>
                  {stock > 0 ? `Na magazynie: ${stock} szt.` : 'Brak w magazynie'}
                </span>
                {category ? <span className="badge text-bg-light border">Kategoria: {category.name}</span> : null}
                {product.is_featured ? <span className="badge text-bg-primary">Polecany</span> : null}
              </div>

              <div className="mb-4">
                <h2 className="h5">Opis produktu</h2>
                <p className="text-muted mb-0" style={{ whiteSpace: 'pre-line' }}>
                  {product.description || 'Ten produkt nie ma jeszcze opisu.'}
                </p>
              </div>

              <div className="row g-3 align-items-end">
                <div className="col-12 col-sm-4">
                  <label className="form-label">Ilość</label>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(stock, 1)}
                    className="form-control"
                    value={safeQty}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={stock <= 0}
                  />
                </div>
                <div className="col-12 col-sm-8 d-grid d-sm-flex gap-2">
                  <button
                    className="btn btn-primary flex-grow-1"
                    onClick={handleAddToCart}
                    disabled={stock <= 0 || adding}
                  >
                    {adding ? 'Dodawanie…' : 'Dodaj do koszyka'}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => navigate('/cart')}>
                    Przejdź do koszyka
                  </button>
                </div>
              </div>

              <hr className="my-4" />

              <div className="small text-muted d-flex flex-column gap-1">
                <span>ID produktu: #{product.id}</span>
                <span>Status: {product.is_active ? 'aktywny' : 'ukryty'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-3">
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                <h2 className="h4 mb-0">Opinie o produkcie</h2>
                <div className="text-muted small">Średnia: {Number(product?.reviews?.avg_rating || 0).toFixed(1)} / 5</div>
              </div>

              <form onSubmit={handleReviewSubmit} className="border rounded-3 p-3 mb-4 bg-light-subtle">
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-3">
                    <label className="form-label">Twoja ocena</label>
                    <select className="form-select" value={reviewRating} onChange={(e) => setReviewRating(e.target.value)}>
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>{value} / 5</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-9">
                    <label className="form-label">Komentarz</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Napisz, jak sprawdził się ten produkt nad wodą…"
                    />
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between gap-2 mt-3 flex-wrap">
                  <div className="small text-muted">
                    {localStorage.getItem('token') ? 'Możesz dodać lub zaktualizować jedną opinię na produkt.' : 'Zaloguj się, żeby dodać opinię.'}
                  </div>
                  <button className="btn btn-primary" disabled={!localStorage.getItem('token') || reviewSaving}>
                    {reviewSaving ? 'Zapisywanie…' : userReview ? 'Zaktualizuj opinię' : 'Dodaj opinię'}
                  </button>
                </div>
                {reviewMessage ? <div className={`alert mt-3 mb-0 ${reviewMessage.includes('udało') || reviewMessage.includes('Zaloguj') ? 'alert-warning' : 'alert-success'}`}>{reviewMessage}</div> : null}
              </form>

              {reviews.length === 0 ? (
                <div className="alert alert-secondary mb-0">Brak opinii. Zostań pierwszą osobą, która oceni ten produkt.</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="border rounded-3 p-3">
                      <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                        <div>
                          <div className="fw-semibold">{review.user_name}</div>
                          <div className="small text-muted">{new Date(review.updated_at || review.created_at).toLocaleString('pl-PL')}</div>
                        </div>
                        <div className="text-end">
                          <Stars value={review.rating} />
                          <div className="small fw-semibold">{review.rating}/5</div>
                        </div>
                      </div>
                      {review.comment ? <p className="mb-0 mt-3" style={{ whiteSpace: 'pre-line' }}>{review.comment}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-body p-4">
              <h2 className="h4">Galeria produktu</h2>
              {images.length === 0 ? (
                <div className="alert alert-secondary mb-0">Produkt nie ma jeszcze galerii zdjęć.</div>
              ) : (
                <div className="row g-2 mt-1">
                  {images.map((image) => (
                    <div className="col-6" key={image.id}>
                      <button
                        type="button"
                        className="btn p-0 border w-100"
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                        onClick={() => setSelectedImage(image.image_url)}
                      >
                        <img
                          src={buildImageUrl(image.image_url)}
                          alt={product.name}
                          style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h2 className="h4 mb-0">Podobne produkty</h2>
        <Link to={category ? `/products?category_id=${category.id}` : '/products'} className="text-decoration-none">
          Zobacz więcej →
        </Link>
      </div>

      {related.length === 0 ? (
        <div className="alert alert-secondary mt-3 mb-0">Brak podobnych produktów do wyświetlenia.</div>
      ) : (
        <div className="row g-3 mt-1">
          {related.map((item) => (
            <div className="col-12 col-sm-6 col-lg-3" key={item.id}>
              <div className="card h-100 shadow-sm">
                {item.image_url ? (
                  <img
                    src={buildImageUrl(item.image_url)}
                    alt={item.name}
                    className="card-img-top"
                    style={{ height: 180, objectFit: 'cover' }}
                  />
                ) : (
                  <div className="bg-light border-bottom" style={{ height: 180 }} />
                )}
                <div className="card-body d-flex flex-column">
                  <div className="fw-semibold">{item.name}</div>
                  <div className="mt-2 mb-3 fw-bold">{Number(item.price || 0).toFixed(2)} zł</div>
                  <Link className="btn btn-outline-primary btn-sm mt-auto" to={`/products/${item.id}`}>
                    Zobacz produkt
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
