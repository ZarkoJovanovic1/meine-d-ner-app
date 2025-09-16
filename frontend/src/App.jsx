import { listDoener, createDoener, updateDoener, deleteDoener } from "./api";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
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
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="stars" title={`${value} Sterne`}>
      {"★".repeat(full)}
      {half ? "☆" : ""}
      {"✩".repeat(empty)}
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

// --- Backend ↔ Frontend Mapping ---
function mapDoenerToShop(d) {
  return {
    id: d._id,
    name: d.name,
    street: d.location || "",
    plz: "", // optional leer; du kannst aus location später PLZ/Ort parsen
    lat: d.coordinates?.lat ?? 0,
    lng: d.coordinates?.lng ?? 0,
    image: d.image || FALLBACK_IMG,
    // Backend hat "bewertung" als Zahl -> für dein UI nutzen wir ein Array
    ratings: Number.isFinite(d.bewertung) ? [d.bewertung] : [],
  };
}

export default function App() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_USER)) || null;
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
  });
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

  useEffect(() => {
    localStorage.setItem(LS_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  function handleLogin(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const login = (fd.get("login") || "").trim();
    const pw = (fd.get("password") || "").trim();
    if (login === "admin" && pw === "admin") {
      setCurrentUser({ name: "Admin", role: "admin" });
    } else if (login === "user" && pw === "user") {
      setCurrentUser({ name: "User", role: "user" });
    } else {
      alert("Falsche Login-Daten");
    }
  }
  function logout() {
    setCurrentUser(null);
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
    });
    setSelectForEditId(null);
  }

  // Die folgenden drei Funktionen ändern aktuell nur den Frontend-State.
  // Wenn du willst, binde ich sie im nächsten Schritt an POST/PUT/DELETE im Backend an.
  function startEdit(shop) {
    setForm({ ...shop });
    setSelectForEditId(shop.id);
  }

  async function upsertShop(e) {
  e.preventDefault();
  if (!form.name) return alert("Name ist erforderlich.");

  // UI -> Backend Payload
  const payload = {
    name: form.name,
    location: [form.street, form.plz].filter(Boolean).join(" · "),
    lat: Number(form.lat),
    lng: Number(form.lng),
    image: form.image || FALLBACK_IMG,
    bewertung:
      Array.isArray(form.ratings) && form.ratings.length
        ? Math.round((form.ratings.reduce((a, b) => a + b, 0) / form.ratings.length) * 10) / 10
        : 3,
  };

  try {
    let saved;
    if (form.id) {
      // UPDATE
      saved = await updateDoener(form.id, payload);
    } else {
      // CREATE
      saved = await createDoener(payload);
    }

    // Backend → UI Mapping
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

  function rateShop(id, stars) {
    setShops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ratings: [...(s.ratings || []), stars] } : s))
    );
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
            <div className="hint">Admin: admin/admin • User: user/user</div>
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
              return (
                <li key={s.id} className="shopitem">
                  <img src={s.image} alt={s.name} />
                  <div className="shopinfo">
                    <h3>{s.name}</h3>
                    <div className="muted">
                      {s.street} {s.plz ? `· ${s.plz}` : ""}
                    </div>
                    <div className="rating">
                      <StarDisplay value={avg} /> <span className="avg">({avg || "0"})</span>
                    </div>
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
                    {isUser && !isAdmin && (
                      <div className="ratebox">
                        <span>Bewerten:</span>
                        <StarInput onRate={(n) => rateShop(s.id, n)} />
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
              <p className="muted small">
                Tipp: Klicke in die Karte, um Koordinaten zu übernehmen.
              </p>
            </form>
          )}
        </section>

        <section className="mapwrap">
          <MapContainer center={center} zoom={7} className="map">
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
                      <span className="avg">({average(s.ratings) || "0"})</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>
      </main>
    </div>
  );
}
