import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, updateMe, changePassword } from '../services/user';
import { getOrderHistory } from '../services/orders';
import API from '../services/api';

export default function Profile() {
  const navigate = useNavigate();

  const [active, setActive] = useState('overview'); // overview | orders | settings | security
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // forms
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    getMe()
      .then((res) => {
        setMe(res.data);
        setName(res.data?.name || '');
        setEmail(res.data?.email || '');
        setAvatarUrl(res.data?.avatar_url || '');
      })
      .catch(() => setErr('Nie udało się pobrać danych profilu.'));
  }, [navigate]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await getOrderHistory();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr('Nie udało się pobrać historii zamówień.');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (active === 'orders') loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpend = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
    return { totalOrders, totalSpend };
  }, [orders]);

  const resetAlerts = () => {
    setMsg('');
    setErr('');
  };

  const onUploadAvatar = async (e) => {
    e.preventDefault();
    resetAlerts();
    if (!avatarFile) {
      setErr('Wybierz plik ze zdjęciem.');
      return;
    }
    try {
      const form = new FormData();
      form.append('avatar', avatarFile);
      const res = await API.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMe(res.data.user);
      setAvatarUrl(res.data.user?.avatar_url || '');
      setAvatarFile(null);
      setMsg('Zdjęcie profilowe zostało zaktualizowane.');
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się wgrać zdjęcia.');
    }
  };

  const onSaveProfile = async (e) => {
    e.preventDefault();
    resetAlerts();
    try {
      const res = await updateMe({ name, email, avatar_url: avatarUrl });
      setMe(res.data.user);
      setMsg('Dane konta zostały zaktualizowane.');
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się zapisać zmian.');
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    resetAlerts();
    try {
      await changePassword({ currentPassword, newPassword });
      setMsg('Hasło zostało zmienione.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Nie udało się zmienić hasła.');
    }
  };

  if (!me && !err) {
    return <div className="container mt-4">Ładowanie…</div>;
  }

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-1">{me ? `Witaj, ${me.name}` : 'Profil'}</h2>
          <div className="text-muted small">Zarządzaj kontem, zobacz historię zakupów i ustawienia bezpieczeństwa.</div>
        </div>
        <span className="badge text-bg-dark align-self-start">{me?.role || 'user'}</span>
      </div>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {err ? <div className="alert alert-danger">{err}</div> : null}

      <div className="row g-3">
        {/* Sidebar */}
        <div className="col-12 col-md-3">
          <div className="list-group shadow-sm">
            <button
              className={`list-group-item list-group-item-action ${active === 'overview' ? 'active' : ''}`}
              onClick={() => { resetAlerts(); setActive('overview'); }}
            >
              Informacje podstawowe
            </button>
            <button
              className={`list-group-item list-group-item-action ${active === 'orders' ? 'active' : ''}`}
              onClick={() => { resetAlerts(); setActive('orders'); }}
            >
              Historia zakupów
            </button>
            <button
              className={`list-group-item list-group-item-action ${active === 'settings' ? 'active' : ''}`}
              onClick={() => { resetAlerts(); setActive('settings'); }}
            >
              Dane konta (email / imię / avatar)
            </button>
            <button
              className={`list-group-item list-group-item-action ${active === 'security' ? 'active' : ''}`}
              onClick={() => { resetAlerts(); setActive('security'); }}
            >
              Bezpieczeństwo (hasło)
            </button>
          </div>

          <div className="card shadow-sm mt-3">
            <div className="card-body">
              <div className="fw-bold mb-2">Podsumowanie</div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Zamówienia</span>
                <span className="fw-bold">{stats.totalOrders}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Wydatki</span>
                <span className="fw-bold">{stats.totalSpend.toFixed(2)} zł</span>
              </div>
              <hr />
              <div className="text-muted small">
                Konto utworzone: {me?.created_at ? new Date(me.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="col-12 col-md-9">
          {active === 'overview' ? (
            <Overview me={me} />
          ) : null}

          {active === 'orders' ? (
            <OrdersPanel loading={loadingOrders} orders={orders} />
          ) : null}

          {active === 'settings' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="mb-3">Dane konta</h4>
                <form onSubmit={onSaveProfile} className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Imię</label>
                    <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Avatar URL (opcjonalnie)</label>
                    <input
                      className="form-control"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="/images/avatars/... lub pełny URL"
                    />
                    <div className="form-text">Możesz wkleić link lub wgrać plik poniżej.</div>
                  </div>

                  <div className="col-12">
                    <button className="btn btn-primary">Zapisz zmiany</button>
                  </div>
                </form>

                <hr />
                <h5 className="mb-2">Zdjęcie profilowe</h5>
                <form onSubmit={onUploadAvatar} className="row g-2" style={{ maxWidth: 520 }}>
                  <div className="col-12">
                    <input
                      type="file"
                      className="form-control"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />
                    <div className="form-text">PNG/JPG/WEBP, max 3MB.</div>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-outline-dark btn-sm" type="submit">Wgraj avatar</button>
                  </div>
                </form>

                <div className="text-muted small mt-3">
                  *Jeśli zmienisz email, przy kolejnym logowaniu użyj nowego adresu.
                </div>
              </div>
            </div>
          ) : null}

          {active === 'security' ? (
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="mb-3">Zmiana hasła</h4>
                <form onSubmit={onChangePassword} className="row g-3" style={{ maxWidth: 520 }}>
                  <div className="col-12">
                    <label className="form-label">Obecne hasło</label>
                    <input
                      type="password"
                      className="form-control"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Nowe hasło</label>
                    <input
                      type="password"
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <div className="form-text">Minimum 6 znaków.</div>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-dark">Zmień hasło</button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Overview({ me }) {
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-6">
        <div className="card shadow-sm h-100">
          <div className="card-body">
            <h4 className="mb-3">Twoje dane</h4>
            <div className="d-flex align-items-center gap-3 mb-3">
              {me?.avatar_url ? (
                <img
                  src={me.avatar_url.startsWith('http') ? me.avatar_url : `http://localhost:5000${me.avatar_url}`}
                  alt={me?.name || 'avatar'}
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div className="bg-light border" style={{ width: 56, height: 56, borderRadius: '50%' }} />
              )}
              <div>
                <div className="fw-bold">{me?.name}</div>
                <div className="text-muted small">{me?.email}</div>
              </div>
            </div>
            <div className="mb-2"><span className="text-muted">Imię:</span> <span className="fw-bold">{me?.name}</span></div>
            <div className="mb-2"><span className="text-muted">Email:</span> <span className="fw-bold">{me?.email}</span></div>
            <div className="mb-2"><span className="text-muted">Rola:</span> <span className="fw-bold">{me?.role}</span></div>
            <div className="mb-0"><span className="text-muted">Utworzono:</span> <span className="fw-bold">{me?.created_at ? new Date(me.created_at).toLocaleString() : '—'}</span></div>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-6">
        <div className="card shadow-sm h-100">
          <div className="card-body">
            <h4 className="mb-3">Szybkie akcje</h4>
            <div className="d-grid gap-2">
              <span className="btn btn-outline-primary disabled">Historia zakupów (zakładka)</span>
              <span className="btn btn-outline-secondary disabled">Dane konta (zakładka)</span>
              <span className="btn btn-outline-dark disabled">Zmiana hasła (zakładka)</span>
            </div>
            <div className="text-muted small mt-3">
              Tip: panel jest podzielony na sekcje, aby łatwo zarządzać kontem.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersPanel({ loading, orders }) {
  const [openId, setOpenId] = useState(orders[0]?.id || null);

  useEffect(() => {
    if (orders.length && openId == null) setOpenId(orders[0].id);
  }, [orders, openId]);

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h4 className="mb-0">Historia zakupów</h4>
          {loading ? <span className="text-muted small">Ładowanie…</span> : null}
        </div>

        {!loading && orders.length === 0 ? (
          <div className="alert alert-secondary mb-0">Brak zamówień. Złóż pierwsze zamówienie, a pojawi się tutaj.</div>
        ) : null}

        <div className="mt-3 d-grid gap-2">
          {orders.map((o) => {
            const isOpen = openId === o.id;
            return (
              <div className="border rounded" key={o.id}>
                <button
                  type="button"
                  className="w-100 btn btn-light text-start d-flex align-items-center gap-3 flex-wrap"
                  onClick={() => toggle(o.id)}
                >
                  <span className="fw-bold">Zamówienie #{o.id}</span>
                  <span className="text-muted small">{o.created_at ? new Date(o.created_at).toLocaleString() : ''}</span>
                  <span className="badge text-bg-warning">{o.status}</span>
                  <span className="ms-auto fw-bold">{Number(o.total_price).toFixed(2)} zł</span>
                  <span className="text-muted">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen ? (
                  <div className="p-3">
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead>
                          <tr>
                            <th>Produkt</th>
                            <th className="text-end">Cena</th>
                            <th className="text-end">Ilość</th>
                            <th className="text-end">Suma</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(o.items || []).map((it, i) => (
                            <tr key={i}>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  {it.image_url ? (
                                    <img
                                      src={it.image_url.startsWith('http') ? it.image_url : `http://localhost:5000${it.image_url}`}
                                      alt={it.name}
                                      style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8 }}
                                    />
                                  ) : (
                                    <div style={{ width: 42, height: 42, borderRadius: 8 }} className="bg-light border" />
                                  )}
                                  <div className="fw-semibold">{it.name || `Produkt #${it.product_id}`}</div>
                                </div>
                              </td>
                              <td className="text-end">{Number(it.price).toFixed(2)} zł</td>
                              <td className="text-end">{it.quantity}</td>
                              <td className="text-end fw-bold">{(Number(it.price) * Number(it.quantity)).toFixed(2)} zł</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex justify-content-end">
                      <div className="fw-bold">Razem: {Number(o.total_price).toFixed(2)} zł</div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="text-muted small mt-3">
          *Historia pokazuje zamówienia z konta użytkownika (gościnne zamówienia nie są przypisane do profilu).
        </div>
      </div>
    </div>
  );
}
