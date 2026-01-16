import React, { useEffect, useMemo, useState } from 'react';
import API from '../services/api';

function imgSrc(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:5000${url}`;
}

function addToGuestCart(product, qty = 1) {
  const cart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
  const existing = cart.find(i => i.product_id === product.id);
  if (existing) existing.quantity += qty;
  else cart.push({ product_id: product.id, name: product.name, price: product.price, quantity: qty });
  localStorage.setItem('guest_cart', JSON.stringify(cart));
}

export default function Products() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [categoryId, setCategoryId] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('default');

  useEffect(() => {
    const load = async () => {
      setLoadError('');
      try {
        const [cRes, pRes] = await Promise.all([
          API.get('/categories'),
          API.get('/products'),
        ]);
        setCategories(Array.isArray(cRes.data) ? cRes.data : []);
        setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      } catch (e) {
        setLoadError('Nie udało się pobrać produktów z bazy danych. Sprawdź czy backend działa.');
      }
    };
    load();
  }, []);

  // Jeśli ktoś wszedł z Home z parametrem ?category=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) setCategoryId(String(cat));
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];

    if (categoryId !== 'all') {
      list = list.filter(p => String(p.category_id) === String(categoryId));
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    if (sort === 'price_asc') list.sort((a,b) => Number(a.price) - Number(b.price));
    if (sort === 'price_desc') list.sort((a,b) => Number(b.price) - Number(a.price));
    if (sort === 'name_asc') list.sort((a,b) => (a.name||'').localeCompare(b.name||''));

    return list;
  }, [products, categoryId, query, sort]);

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
      // Jeśli coś pójdzie źle (np. token wygasł), wracamy do gościa
      addToGuestCart(product, 1);
      alert('Nie udało się dodać do koszyka konta – dodano jako gość.');
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0">Produkty</h2>
        <div className="text-muted small">Łącznie: {filtered.length}</div>
      </div>

      {loadError ? <div className="alert alert-warning">{loadError}</div> : null}

      <div className="row g-3">
        {/* Sidebar */}
        <div className="col-12 col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Filtry</h5>

              <label className="form-label">Kategoria</label>
              <select
                className="form-select mb-3"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="all">Wszystkie kategorie</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="mb-3">
                <label className="form-label">Szukaj</label>
                <input
                  className="form-control"
                  placeholder="np. wędka, plecionka..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="mb-0">
                <label className="form-label">Sortowanie</label>
                <select
                  className="form-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="default">Domyślnie</option>
                  <option value="price_asc">Cena: rosnąco</option>
                  <option value="price_desc">Cena: malejąco</option>
                  <option value="name_asc">Nazwa: A–Z</option>
                </select>
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-3 mb-0">
            Możesz kupować jako gość – koszyk zapisuje się w przeglądarce (localStorage).
          </div>
        </div>

        {/* Grid */}
        <div className="col-12 col-md-9">
          {!loadError && products.length === 0 ? (
            <div className="alert alert-secondary">Brak produktów w bazie danych. Dodaj dane seedem.</div>
          ) : null}

          <div className="row g-3">
            {filtered.map((p) => (
              <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                <div className="card h-100 shadow-sm">
                  {p.image_url ? (
                    <img
                      src={imgSrc(p.image_url)}
                      className="card-img-top"
                      alt={p.name}
                      style={{ height: 180, objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="bg-light border-bottom" style={{ height: 180 }} />
                  )}

                  <div className="card-body d-flex flex-column">
                    <h6 className="card-title mb-1">{p.name}</h6>

                    {p.description ? (
                      <div className="text-muted small mb-2" style={{ minHeight: 36 }}>
                        {p.description}
                      </div>
                    ) : (
                      <div className="text-muted small mb-2" style={{ minHeight: 36 }}>
                        —
                      </div>
                    )}

                    <div className="d-flex align-items-center justify-content-between">
                      <div className="fw-bold">{Number(p.price).toFixed(2)} zł</div>
                      <span className={`badge ${p.stock > 0 ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {p.stock > 0 ? `Dostępne: ${p.stock}` : 'Brak'}
                      </span>
                    </div>

                    <div className="mt-auto pt-3">
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

          {filtered.length === 0 && !loadError ? (
            <div className="alert alert-secondary mt-3 mb-0">Brak wyników dla podanych filtrów.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
