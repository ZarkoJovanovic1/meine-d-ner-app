import { createDoener, updateDoener, deleteDoener, rateDoener, addComment, deleteComment } from "./api";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// ✅ Leaflet-Icon fix
const DefaultIcon = L.icon({
  iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const LS_USER = "doenerfinder_user_v1";
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop";

function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function StarDisplay({ value }) {
  const v = Number.isFinite(value) ? value : 0;
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="stars" title={`${v} Sterne`}>
      {"★".repeat(full)}
      {half ? "☆" : ""}
      {"☆".repeat(empty)}
    </span>
  );
}

function StarInput({ onRate }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-input" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= hover ? "hover" : ""}
          onMouseEnter={() => setHover(n)}
          onClick={() => onRate(n)}
          aria-label={`${n} Sterne geben`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function MapClickHelper({ onClick }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng);
    },
  });
  return null;
}

// Nur Marker mit sinnvollen Koordinaten verwenden
function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

// Zoomt auf alle Shops, wenn sich die Liste ändert
function FitToShops({ shops }) {
  const map = useMap();

  useEffect(() => {
    // Gültige Punkte sammeln
    const pts = (shops || [])
      .filter(s => isValidCoord(s.lat, s.lng))
      .map(s => [s.lat, s.lng]);

    if (pts.length === 0) {
      // Fallback: Zürich
      map.setView([47.3769, 8.5417], 12);
      return;
    }
    if (pts.length === 1) {
      map.setView(pts[0], 16);         // nah ran bei einem Marker
      return;
    }
    const bounds = L.latLngBounds(pts);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  }, [shops, map]);

  return null;
}


// --- Backend ↔ Frontend Mapping ---
function mapDoenerToShop(d) {
  return {
    id: d.id || d._id, // akzeptiere sowohl `id` (toPublic) als auch Mongo `_id`
    name: d.name,
    street: d.location || "",
    plz: "",
    lat: d.coordinates?.lat ?? 0,
    lng: d.coordinates?.lng ?? 0,
    image: d.image || FALLBACK_IMG,
    ratings: Array.isArray(d.ratings) ? d.ratings : [],
    comments: Array.isArray(d.comments) ? d.comments : [],
  };
}

export default function App() {
  const [shops, setShops] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAllComments, setShowAllComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Kein Auto-Login für Admin: gespeicherten Admin ignorieren
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_USER)) || null;
   
      return saved;
    } catch {
      return null;
    }
  });

  const [form, setForm] = useState({
    id: null,
    name: "",
    street: "",
    plz: "",
    lat: 47.3769,
    lng: 8.5417,
    image: "",
    ratings: [],
    comments: [],
  });
  const [commentDrafts, setCommentDrafts] = useState({}); // { [shopId]: "text" }
  const [selectForEditId, setSelectForEditId] = useState(null);

  const isAdmin = currentUser?.role === "admin";
  const isUser = !!currentUser;

  const center = useMemo(() => [47.3769, 8.5417], []); // Zürich

  // --- Daten vom Backend laden ---
  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL;
    async function load() {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${BASE}/api/doener`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        setShops(Array.isArray(data) ? data.map(mapDoenerToShop) : []);
      } catch (e) {
        console.error(e);
        setErr("Konnte Daten nicht laden.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Persistiere nur Nicht-Admin-User; Admin wird entfernt (kein Auto-Login nach Reload)
  useEffect(() => {
   if (currentUser) {
   localStorage.setItem(LS_USER, JSON.stringify(currentUser));
 } else {
   localStorage.removeItem(LS_USER);
   }
  }, [currentUser]);

  function handleLogin(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const login = (fd.get("login") || "").trim();
    const pw = (fd.get("password") || "").trim();

    if (login === "admin" && pw === "admin") {
      const u = { name: "Admin", role: "admin" };
      setCurrentUser(u);
      try { localStorage.setItem(LS_USER, JSON.stringify(u)); } catch {}
    } else if (login === "user" && pw === "user") {
      const u = { name: "User", role: "user" };
      setCurrentUser(u);
      try { localStorage.setItem(LS_USER, JSON.stringify(u)); } catch {}
    } else {
      alert("Falsche Login-Daten");
    }
  }

  function logout() {
    setCurrentUser(null);
    try { localStorage.removeItem(LS_USER); } catch {}
  }

  function resetForm() {
    setForm({
      id: null,
      name: "",
      street: "",
      plz: "",
      lat: 47.3769,
      lng: 8.5417,
      image: "",
      ratings: [],
      comments: [],
    });
    setSelectForEditId(null);
  }

  function startEdit(shop) {
    setForm({ ...shop });
    setSelectForEditId(shop.id);
  }

  // CREATE / UPDATE
  async function upsertShop(e) {
    e.preventDefault();
    if (!form.name) return alert("Name ist erforderlich.");

    const payload = {
      name: form.name,
      location: [form.street, form.plz].filter(Boolean).join(" · "),
      lat: Number(form.lat),
      lng: Number(form.lng),
      image: form.image || FALLBACK_IMG,
      ratings: Array.isArray(form.ratings) ? form.ratings : [],
      comments: Array.isArray(form.comments) ? form.comments : [],
    };

    try {
      let saved;
      if (form.id) {
        saved = await updateDoener(form.id, payload);
      } else {
        saved = await createDoener(payload);
      }

      const mapped = mapDoenerToShop(saved);
      setShops((prev) => {
        const i = prev.findIndex((s) => s.id === mapped.id);
        if (i >= 0) {
          const copy = [...prev];
          copy[i] = mapped;
          return copy;
        }
        return [...prev, mapped];
      });
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Speichern fehlgeschlagen.");
    }
  }

  // DELETE SHOP
  async function deleteShop(id) {
    if (!confirm("Diesen Laden wirklich löschen?")) return;
    try {
      await deleteDoener(id);
      setShops((prev) => prev.filter((s) => s.id !== id));
      if (selectForEditId === id) resetForm();
    } catch (err) {
      console.error(err);
      alert("Löschen fehlgeschlagen.");
    }
  }

  // RATE
  async function rateShop(id, stars) {
    const current = shops.find((s) => s.id === id);
    if (!current) return;

    const optimistic = [...(current.ratings || []), stars];

    setShops((prev) => prev.map((s) => (s.id === id ? { ...s, ratings: optimistic } : s)));

    try {
      const saved = await rateDoener(id, stars);
      const mapped = mapDoenerToShop(saved);
      setShops((prev) => prev.map((s) => (s.id === id ? mapped : s)));
    } catch (err) {
      console.error(err);
      alert("Bewertung konnte nicht gespeichert werden.");
      setShops((prev) => prev.map((s) => (s.id === id ? current : s)));
    }
  }

  // COMMENT
  async function submitComment(id) {
    const current = shops.find((s) => s.id === id);
    if (!current) return;
    const text = (commentDrafts[id] || "").trim();
    if (!text) return alert("Bitte einen Kommentar eingeben.");

    const draft = { user: currentUser?.name || "Gast", text, createdAt: new Date().toISOString() };
    const optimistic = [...(current.comments || []), draft];

    setShops((prev) => prev.map((s) => (s.id === id ? { ...s, comments: optimistic } : s)));
    setCommentDrafts((d) => ({ ...d, [id]: "" }));

    try {
      const saved = await addComment(id, { user: draft.user, text: draft.text });
      const mapped = mapDoenerToShop(saved);
      setShops((prev) => prev.map((s) => (s.id === id ? mapped : s)));
    } catch (err) {
      console.error(err);
      alert("Kommentar konnte nicht gespeichert werden.");
      setShops((prev) => prev.map((s) => (s.id === id ? current : s)));
      setCommentDrafts((d) => ({ ...d, [id]: text }));
    }
  }

  // DELETE COMMENT (Admin) — jetzt _id-basiert
  async function handleDeleteComment(shopId, commentId) {
    try {
      await deleteComment(shopId, commentId);
      setShops((prev) =>
        prev.map((x) => {
          if (x.id !== shopId) return x;
          const copy = { ...x, comments: (x.comments || []).slice() };
          const byId = copy.comments.findIndex((c) => String(c._id) === String(commentId));
          if (byId !== -1) {
            copy.comments.splice(byId, 1);
          }
          return copy;
        })
      );
    } catch (e) {
      alert("Kommentar konnte nicht gelöscht werden: " + e.message);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>🧭 DönerFinder</h1>
        {isUser ? (
          <div className="userbox">
            Eingeloggt als <strong>{currentUser.name}</strong> ({currentUser.role})
            <button className="btn" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <form className="login" onSubmit={handleLogin}>
            <input name="login" placeholder="Login" autoComplete="username" required />
            <input
              name="password"
              type="password"
              placeholder="Passwort"
              autoComplete="current-password"
              required
            />
            <button className="btn" type="submit">
              Login
            </button>

          </form>
        )}
      </header>

      <main className="content">
        <section className="left">
          <h2>Läden</h2>

          {loading && <p className="muted">Lade Daten…</p>}
          {err && <p className="error">{err}</p>}

          <ul className="shoplist">
            {shops.map((s) => {
              const avg = average(s.ratings);
              const commentList = (s.comments || []).slice().reverse();
              const expanded = !!showAllComments[s.id];
              const visible = expanded ? commentList : commentList.slice(0, 3);

              return (
                <li key={s.id} className="shopitem">
                  <img src={s.image} alt={s.name} />
                  <div className="shopinfo">
                    <h3>{s.name}</h3>
                    <div className="muted">
                      {s.street} {s.plz ? `· ${s.plz}` : ""}
                    </div>

                    <div className="rating">
  {isUser && !isAdmin ? (
    <StarInput onRate={(n) => rateShop(s.id, n)} />
  ) : (
    <StarDisplay value={avg} />
  )}
  <span className="avg">
    {(avg || 0).toFixed(1)} ({s.ratings ? s.ratings.length : 0} Bewertungen)
  </span>
</div>
<p className="credits muted small" style={{ marginTop: 8 }}>
  Datenquelle: © OpenStreetMap-Mitwirkende — <a
    href="https://www.openstreetmap.org/copyright"
    target="_blank" rel="noreferrer"
  >ODbL</a>
</p>

                    {isAdmin && (
                      <div className="row">
                        <button className="btn sm" onClick={() => startEdit(s)}>
                          Bearbeiten
                        </button>
                        <button className="btn sm danger" onClick={() => deleteShop(s.id)}>
                          Löschen
                        </button>
                      </div>
                    )}

                    {/* Kommentare */}
                    {commentList.length > 0 && (
                      <div className="comments">
                        <div className="comments-title">Kommentare</div>
                        <ul className="comment-list">
                          {visible.map((c, idx) => (
                            <li key={c._id || idx} className="comment-item">
                              <div className="comment-meta">
                                <strong className={`username ${c.user === "Gast" ? "guest" : ""}`}>
                                  {c.user || "Gast"}
                                </strong>{" "}
                                <span className="timestamp small">
                                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                                </span>
                                {isAdmin && (
                                  <button
                                    className="btn btn-danger btn-xs"
                                    style={{ marginLeft: 8 }}
                                    onClick={() => setConfirmDelete({ shopId: s.id, commentId: c._id })}
                                  >
                                    Löschen
                                  </button>
                                )}
                              </div>
                              <div className="comment-text">{c.text}</div>
                            </li>
                          ))}
                        </ul>

                        {commentList.length > 3 && (
                          <button
                            className="btn btn-link small"
                            onClick={() =>
                              setShowAllComments((p) => ({ ...p, [s.id]: !expanded }))
                            }
                          >
                            {expanded
                              ? "Weniger anzeigen"
                              : `Alle Kommentare anzeigen (${commentList.length})`}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Kommentar-Feld: nur für eingeloggte User (nicht Admin) */}
                    {isUser && !isAdmin && (
                      <div className="comment-box">
                        <textarea
                          rows={2}
                          placeholder="Dein Kommentar …"
                          value={commentDrafts[s.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                          }
                        />
                        <div className="row">
                          <button className="btn sm" onClick={() => submitComment(s.id)}>
                            Kommentar senden
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {isAdmin && (
            <form className="editor" onSubmit={upsertShop}>
              <h2>{selectForEditId ? "Laden bearbeiten" : "Laden hinzufügen"}</h2>
              <div className="grid">
                <label>
                  Name
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Straße / Adresse
                  <input
                    value={form.street}
                    onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                  />
                </label>
                <label>
                  PLZ/Ort
                  <input
                    value={form.plz}
                    onChange={(e) => setForm((f) => ({ ...f, plz: e.target.value }))}
                  />
                </label>
                <label>
                  Bild-URL
                  <input
                    value={form.image}
                    onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                    placeholder="https://..."
                  />
                </label>
                <label>
                  Breite (lat)
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lat}
                    onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  />
                </label>
                <label>
                  Länge (lng)
                  <input
                    type="number"
                    step="0.0001"
                    value={form.lng}
                    onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  />
                </label>
              </div>
              <div className="row">
                <button className="btn" type="submit">
                  {selectForEditId ? "Speichern" : "Hinzufügen"}
                </button>
                {selectForEditId && (
                  <button type="button" className="btn ghost" onClick={resetForm}>
                    Abbrechen
                  </button>
                )}
              </div>
              <p className="muted small">Tipp: Klicke in die Karte, um Koordinaten zu übernehmen.</p>
            </form>
          )}
        </section>

        <section className="mapwrap">
          <MapContainer center={center} zoom={13} minZoom={3} maxZoom={19} className="map">
          <FitToShops shops={shops} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHelper
              onClick={(latlng) => {
                if (isAdmin)
                  setForm((f) => ({
                    ...f,
                    lat: Number(latlng.lat.toFixed(4)),
                    lng: Number(latlng.lng.toFixed(4)),
                  }));
              }}
            />
            {shops.map((s) => (
              <Marker position={[s.lat, s.lng]} key={s.id}>
                <Popup>
                  <div className="popup">
                    <img src={s.image} alt={s.name} />
                    <h3>{s.name}</h3>
                    <div className="muted">
                      {s.street} {s.plz ? `· ${s.plz}` : ""}
                    </div>
                    <div className="rating">
                      <StarDisplay value={average(s.ratings)} />{" "}
                      <span className="avg">
                        {(average(s.ratings) || 0).toFixed(1)} ({s.ratings ? s.ratings.length : 0} Bewertungen)
                      </span>
                    </div>

                    {s.comments && s.comments.length > 0 && (
                      <div className="comments">
                        <div className="comments-title">Kommentare</div>
                        <ul className="comment-list">
                          {s.comments.slice(-3).reverse().map((c, idx) => (
                            <li key={c._id || idx} className="comment-item">
                              <div className="comment-meta">
                                <strong className={`username ${c.user === "Gast" ? "guest" : ""}`}>
                                  {c.user || "Gast"}
                                </strong>{" "}
                                <span className="timestamp small">
                                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                                </span>
                              </div>
                              <div className="comment-text">{c.text}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>
      </main>

      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Kommentar löschen?</h3>
            <p>
              Willst du diesen Kommentar wirklich löschen?
              <br />
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="row">
              <button
                className="btn danger"
                onClick={() => {
                  handleDeleteComment(confirmDelete.shopId, confirmDelete.commentId);
                  setConfirmDelete(null);
                }}
              >
                Löschen
              </button>
              <button className="btn ghost" onClick={() => setConfirmDelete(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
