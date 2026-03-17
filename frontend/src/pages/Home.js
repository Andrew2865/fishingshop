import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { buildImageUrl } from '../config';

function Price({ price, old_price }) {
  const p = Number(price || 0).toFixed(2);
  if (!old_price) return <span className="fw-bold">{p} zł</span>;
  const o = Number(old_price).toFixed(2);
  return (
    <>
      <span className="text-muted text-decoration-line-through me-2">{o} zł</span>
      <span className="fw-bold">{p} zł</span>
    </>
  );
}

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    const load = async () => {
      setErr('');
      setLoading(true);
      try {
        const [cRes, pRes] = await Promise.all([
          API.get('/categories'),
          API.get('/products'),
        ]);
        setCategories(Array.isArray(cRes.data) ? cRes.data : []);
        const normalizedProducts = Array.isArray(pRes.data?.items) ? pRes.data.items : (Array.isArray(pRes.data) ? pRes.data : []);
        setProducts(normalizedProducts);
      } catch (e) {
        setErr('Nie udało się pobrać danych ze sklepu. Sprawdź czy backend działa.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const promo = useMemo(() => products.filter((p) => p.is_promo).slice(0, 6), [products]);
  const featured = useMemo(() => products.filter((p) => p.is_featured).slice(0, 6), [products]);
  const newest = useMemo(() => [...products].slice(0, 6), [products]);

  return (
    <div className="container mt-4">
      {err ? <div className="alert alert-warning">{err}</div> : null}

      <div className="p-4 p-md-5 bg-dark text-white rounded-4 shadow-sm">
        <div className="row align-items-center g-4">
          <div className="col-12 col-lg-7">
            <h1 className="display-6 fw-bold mb-2">Fishing Shop</h1>
            <p className="mb-3 text-white-50">
              Sprzęt wędkarski dla początkujących i zaawansowanych. Wędki, kołowrotki, przynęty, akcesoria i więcej.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <Link className="btn btn-primary" to="/products">Przejdź do produktów</Link>
              <Link className="btn btn-outline-light" to="/cart">Zobacz koszyk</Link>
            </div>
          </div>
          <div className="col-12 col-lg-5">
            <div className="bg-white bg-opacity-10 rounded-4 p-3">
              <div className="fw-semibold mb-2">Dlaczego warto?</div>
              <ul className="mb-0 text-white-50">
                <li>Zakupy jako gość lub po zalogowaniu</li>
                <li>Szybka realizacja zamówień</li>
                <li>Promocje i produkty wyróżnione</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between mt-4 mb-2">
        <h3 className="mb-0">Kategorie</h3>
        <Link className="small text-decoration-none" to="/products">Zobacz wszystkie →</Link>
      </div>

      {loading ? <div className="alert alert-light border">Ładowanie kategorii i polecanych produktów…</div> : null}

      <div className="row g-3">
        {categories.map((cat) => (
          <div className="col-12 col-sm-6 col-lg-3" key={cat.id}>
            <Link to={`/products?category_id=${cat.id}`} className="text-decoration-none">
              <div className="card shadow-sm h-100">
                {cat.image_url ? (
                  <img
                    src={buildImageUrl(cat.image_url)}
                    alt={cat.name}
                    className="card-img-top"
                    style={{ height: 140, objectFit: 'cover' }}
                  />
                ) : (
                  <div className="bg-light border-bottom" style={{ height: 140 }} />
                )}
                <div className="card-body">
                  <div className="fw-bold">{cat.name}</div>
                  {cat.description ? <div className="text-muted small mt-1">{cat.description}</div> : null}
                </div>
              </div>
            </Link>
          </div>
        ))}
        {!loading && !err && categories.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-secondary mb-0">Brak kategorii w bazie danych.</div>
          </div>
        ) : null}
      </div>

      <SectionProducts title="Promocje" products={promo} emptyText="Brak produktów promocyjnych." loading={loading} />
      <SectionProducts title="Polecane" products={featured} emptyText="Brak produktów wyróżnionych." loading={loading} />
      <SectionProducts title="Nowości" products={newest} emptyText="Brak produktów." loading={loading} />
    </div>
  );
}

function SectionProducts({ title, products, emptyText, loading }) {
  return (
    <>
      <div className="d-flex align-items-center justify-content-between mt-4 mb-2">
        <h3 className="mb-0">{title}</h3>
        <Link className="small text-decoration-none" to="/products">Zobacz więcej →</Link>
      </div>

      {loading ? (
        <div className="alert alert-light border">Ładowanie sekcji „{title.toLowerCase()}”…</div>
      ) : products.length === 0 ? (
        <div className="alert alert-secondary">{emptyText}</div>
      ) : (
        <div className="row g-3">
          {products.map((p) => (
            <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
              <div className="card shadow-sm h-100">
                {p.image_url ? (
                  <img
                    src={buildImageUrl(p.image_url)}
                    alt={p.name}
                    className="card-img-top"
                    style={{ height: 180, objectFit: 'cover' }}
                  />
                ) : (
                  <div className="bg-light border-bottom" style={{ height: 180 }} />
                )}

                <div className="card-body d-flex flex-column">
                  <div className="fw-bold">{p.name}</div>
                  {p.description ? <div className="text-muted small mt-1">{p.description}</div> : null}

                  <div className="mt-2">
                    <Price price={p.price} old_price={p.old_price} />
                  </div>

                  <div className="mt-auto pt-3 d-grid gap-2">
                    <Link className="btn btn-primary btn-sm w-100" to={`/products/${p.id}`}>
                      Zobacz produkt
                    </Link>
                    <Link className="btn btn-outline-primary btn-sm w-100" to={`/products?category_id=${p.category_id || ''}`}>
                      Więcej w tej kategorii
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
