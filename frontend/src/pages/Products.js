import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { buildImageUrl } from '../config';
import { getCategories } from '../services/categories';
import { getProducts } from '../services/products';
import API from '../services/api';

function addToGuestCart(product, qty = 1) {
  const cart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
  const existing = cart.find((i) => i.product_id === product.id);
  if (existing) existing.quantity += qty;
  else cart.push({ product_id: product.id, name: product.name, price: product.price, quantity: qty });
  localStorage.setItem('guest_cart', JSON.stringify(cart));
}

const PAGE_SIZE = 12;

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const categoryId = searchParams.get('category_id') || searchParams.get('category') || 'all';
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = Number(searchParams.get('page') || '1');

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadError('');
      setLoading(true);
      try {
        const params = {
          page,
          page_size: PAGE_SIZE,
          sort,
        };
        if (categoryId !== 'all') params.category_id = categoryId;
        if (query.trim()) params.q = query.trim();

        const res = await getProducts(params);
        const payload = res.data;
        setProducts(Array.isArray(payload?.items) ? payload.items : []);
        setPagination(payload?.pagination || null);
      } catch (e) {
        setLoadError('Nie udało się pobrać produktów z bazy danych. Sprawdź czy backend działa.');
        setProducts([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryId, query, sort, page]);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') params.delete(key);
      else params.set(key, String(value));
    });
    if (!('page' in next)) params.set('page', '1');
    setSearchParams(params);
  };

  const handleAddToCart = async (product) => {
    const token = localStorage.getItem('token');
    if (!token) {
      addToGuestCart(product, 1);
      alert('Dodano do koszyka (gość).');
      return;
    }
    try {
      await API.post('/cart', { product_id: product.id, quantity: 1 });
      alert('Dodano do koszyka.');
    } catch (e) {
      addToGuestCart(product, 1);
      alert('Nie udało się dodać do koszyka konta – dodano jako gość.');
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h2 className="mb-0">Produkty</h2>
        <div className="text-muted small">
          {pagination ? `Łącznie: ${pagination.total}` : `Na stronie: ${products.length}`}
        </div>
      </div>

      {loadError ? <div className="alert alert-warning">{loadError}</div> : null}

      <div className="row g-3">
        <div className="col-12 col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Filtry</h5>

              <label className="form-label">Kategoria</label>
              <select
                className="form-select mb-3"
                value={categoryId}
                onChange={(e) => updateParams({ category_id: e.target.value, category: null, page: 1 })}
              >
                <option value="all">Wszystkie kategorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="mb-3">
                <label className="form-label">Szukaj</label>
                <input
                  className="form-control"
                  placeholder="np. wędka, plecionka..."
                  value={query}
                  onChange={(e) => updateParams({ q: e.target.value, page: 1 })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Sortowanie</label>
                <select
                  className="form-select"
                  value={sort}
                  onChange={(e) => updateParams({ sort: e.target.value, page: 1 })}
                >
                  <option value="newest">Najnowsze</option>
                  <option value="price_asc">Cena: rosnąco</option>
                  <option value="price_desc">Cena: malejąco</option>
                  <option value="name_asc">Nazwa: A–Z</option>
                  <option value="promo">Najpierw promocje</option>
                </select>
              </div>

              <button
                className="btn btn-outline-secondary btn-sm w-100"
                type="button"
                onClick={() => setSearchParams(new URLSearchParams())}
              >
                Wyczyść filtry
              </button>
            </div>
          </div>

          <div className="alert alert-info mt-3 mb-0">
            Możesz kupować jako gość – koszyk zapisuje się w przeglądarce (localStorage).
          </div>
        </div>

        <div className="col-12 col-md-9">
          {loading ? <div className="alert alert-light border">Ładowanie produktów…</div> : null}

          {!loading && !loadError && products.length === 0 ? (
            <div className="alert alert-secondary">
              {query || categoryId !== 'all'
                ? 'Brak wyników dla podanych filtrów.'
                : 'Brak produktów w bazie danych.'}
            </div>
          ) : null}

          <div className="row g-3">
            {products.map((p) => (
              <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                <div className="card h-100 shadow-sm">
                  {p.image_url ? (
                    <img
                      src={buildImageUrl(p.image_url)}
                      className="card-img-top"
                      alt={p.name}
                      style={{ height: 180, objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="bg-light border-bottom" style={{ height: 180 }} />
                  )}

                  <div className="card-body d-flex flex-column">
                    <h6 className="card-title mb-1">{p.name}</h6>

                    <div className="text-muted small mb-2" style={{ minHeight: 42 }}>
                      {p.description || 'Brak opisu produktu.'}
                    </div>

                    <div className="d-flex align-items-center justify-content-between">
                      <div className="fw-bold">{Number(p.price).toFixed(2)} zł</div>
                      <span className={`badge ${p.stock > 0 ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {p.stock > 0 ? `Dostępne: ${p.stock}` : 'Brak'}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 d-grid gap-2">
                      <Link
                        className="btn btn-outline-primary btn-sm"
                        to={`/products/${p.id}`}
                      >
                        Zobacz szczegóły
                      </Link>
                      <button
                        className="btn btn-primary btn-sm w-100"
                        onClick={() => handleAddToCart(p)}
                        disabled={p.stock <= 0}
                      >
                        Dodaj do koszyka
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && pagination && pagination.total_pages > 1 ? (
            <div className="d-flex align-items-center justify-content-between mt-4 flex-wrap gap-2">
              <div className="text-muted small">
                Strona {pagination.page} z {pagination.total_pages}
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={!pagination.has_prev}
                  onClick={() => updateParams({ page: pagination.page - 1 })}
                >
                  ← Poprzednia
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={!pagination.has_next}
                  onClick={() => updateParams({ page: pagination.page + 1 })}
                >
                  Następna →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
