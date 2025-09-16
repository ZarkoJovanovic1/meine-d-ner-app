
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

/**
 * --- Funktionen laut Nutzerwunsch ---
 * 1) Marker sichtbar (richtiges Icon, keine Rechtecke)
 * 2) Login-Funktion mit 2 Konten:
 *    - Admin: admin/admin  -> Läden anlegen / ändern / löschen / bearbeiten
 *    - User:  user/user    -> Läden bewerten
 * 3) Läden haben ein Bild + Sternebewertung (fiktive Bewertungen + Durchschnitt)
 *
 * Implementierung: rein Frontend (LocalStorage). Kein Backend notwendig.
 */

// ✅ Leaflet Standard-Icon fixen (Vite benötigt explizite URLs)
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

// ---- Typen ----
/**
 * DoenerShop = {
 *   id: string,
 *   name: string,
 *   street: string,
 *   plz: string,
 *   lat: number,
 *   lng: number,
 *   image: string,            // Bild-URL
 *   ratings: number[],        // einzelne Bewertungen 1..5
 * }
 */

const LS_KEY = "doenerfinder_shops_v1";
const LS_USER = "doenerfinder_user_v1";

const seedData = [
  {
    id: crypto.randomUUID(),
    name: "Döner Palast",
    street: "Hauptstrasse 12",
    plz: "8001 Zürich",
    lat: 47.3769, lng: 8.5417,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop",
    ratings: [5, 4, 4, 5],
  },
  {
    id: crypto.randomUUID(),
    name: "Istanbul Grill",
    street: "Bahnhofstrasse 55",
    plz: "4051 Basel",
    lat: 47.5596, lng: 7.5886,
    image: "https://images.unsplash.com/photo-1604908176997-4316512b6922?q=80&w=1200&auto=format&fit=crop",
    ratings: [3, 4, 5, 3, 4],
  },
  {
    id: crypto.randomUUID(),
    name: "Anatolia Kebap",
    street: "Kaiser-Josef-Str. 7",
    plz: "79098 Freiburg",
    lat: 47.9961, lng: 7.8494,
    image: "https://images.unsplash.com/photo-1611511549347-0f2c0c6daeb9?q=80&w=1200&auto=format&fit=crop",
    ratings: [4, 4, 4],
  },
];

function loadShops() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(seedData));
      return seedData;
    }
    const parsed = JSON.parse(raw);
    // Falls altes Format: normalisieren
    return Array.isArray(parsed) ? parsed : seedData;
  } catch {
    return seedData;
  }
}
function saveShops(shops) {
  localStorage.setItem(LS_KEY, JSON.stringify(shops));
}

function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function StarDisplay({ value }) {
  // value 0..5 (kann z.B. 4.3 sein)
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

export default function App() {
  const [shops, setShops] = useState(loadShops);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_USER)) || null; } catch { return null; }
  });
  const [form, setForm] = useState({
    id: null, name: "", street: "", plz: "",
    lat: 47.3769, lng: 8.5417, image: ""
  });
  const [selectForEditId, setSelectForEditId] = useState(null);
  const isAdmin = currentUser?.role === "admin";
  const isUser = !!currentUser;

  useEffect(() => saveShops(shops), [shops]);
  useEffect(() => localStorage.setItem(LS_USER, JSON.stringify(currentUser)), [currentUser]);

  const center = useMemo(() => [47.3769, 8.5417], []); // Zürich

  function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const login = (formData.get("login") || "").trim();
    const pw = (formData.get("password") || "").trim();
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
    setForm({ id: null, name: "", street: "", plz: "", lat: 47.3769, lng: 8.5417, image: "" });
    setSelectForEditId(null);
  }

  function startEdit(shop) {
    setForm({ ...shop });
    setSelectForEditId(shop.id);
  }

  function upsertShop(e) {
    e.preventDefault();
    if (!form.name) return alert("Name ist erforderlich.");
    const newShop = {
      id: form.id || crypto.randomUUID(),
      name: form.name,
      street: form.street,
      plz: form.plz,
      lat: Number(form.lat),
      lng: Number(form.lng),
      image: form.image || "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop",
      ratings: form.ratings || [],
    };
    setShops((prev) => {
      const idx = prev.findIndex((s) => s.id === newShop.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newShop };
        return copy;
      }
      return [...prev, newShop];
    });
    resetForm();
  }

  function deleteShop(id) {
    if (!confirm("Diesen Laden wirklich löschen?")) return;
    setShops((prev) => prev.filter((s) => s.id !== id));
    if (selectForEditId === id) resetForm();
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
            <button className="btn" onClick={logout}>Logout</button>
          </div>
        ) : (
          <form className="login" onSubmit={handleLogin}>
            <input name="login" placeholder="Login" autoComplete="username" required />
            <input name="password" type="password" placeholder="Passwort" autoComplete="current-password" required />
            <button className="btn" type="submit">Login</button>
            <div className="hint">Admin: admin/admin • User: user/user</div>
          </form>
        )}
      </header>

      <main className="content">
        <section className="left">
          <h2>Läden</h2>
          <ul className="shoplist">
            {shops.map((s) => {
              const avg = average(s.ratings);
              return (
                <li key={s.id} className="shopitem">
                  <img src={s.image} alt={s.name} />
                  <div className="shopinfo">
                    <h3>{s.name}</h3>
                    <div className="muted">{s.street} · {s.plz}</div>
                    <div className="rating">
                      <StarDisplay value={avg} /> <span className="avg">({avg || "0"})</span>
                    </div>
                    {isAdmin && (
                      <div className="row">
                        <button className="btn sm" onClick={() => startEdit(s)}>Bearbeiten</button>
                        <button className="btn sm danger" onClick={() => deleteShop(s.id)}>Löschen</button>
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
                  <input value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} required />
                </label>
                <label>
                  Straße
                  <input value={form.street} onChange={(e)=>setForm(f=>({...f,street:e.target.value}))} />
                </label>
                <label>
                  PLZ/Ort
                  <input value={form.plz} onChange={(e)=>setForm(f=>({...f,plz:e.target.value}))} />
                </label>
                <label>
                  Bild-URL
                  <input value={form.image} onChange={(e)=>setForm(f=>({...f,image:e.target.value}))} placeholder="https://..." />
                </label>
                <label>
                  Breite (lat)
                  <input type="number" step="0.0001" value={form.lat} onChange={(e)=>setForm(f=>({...f,lat:e.target.value}))} />
                </label>
                <label>
                  Länge (lng)
                  <input type="number" step="0.0001" value={form.lng} onChange={(e)=>setForm(f=>({...f,lng:e.target.value}))} />
                </label>
              </div>
              <div className="row">
                <button className="btn" type="submit">{selectForEditId ? "Speichern" : "Hinzufügen"}</button>
                {selectForEditId && <button type="button" className="btn ghost" onClick={resetForm}>Abbrechen</button>}
              </div>
              <p className="muted small">Tipp: Klicke in die Karte, um Koordinaten zu übernehmen.</p>
            </form>
          )}
        </section>

        <section className="mapwrap">
          <MapContainer center={center} zoom={7} className="map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHelper onClick={(latlng)=>{
              if (isAdmin) setForm(f=>({...f, lat: latlng.lat.toFixed(4)*1, lng: latlng.lng.toFixed(4)*1 }))
            }}/>
            {shops.map((s)=>(
              <Marker position={[s.lat, s.lng]} key={s.id}>
                <Popup>
                  <div className="popup">
                    <img src={s.image} alt={s.name} />
                    <h3>{s.name}</h3>
                    <div className="muted">{s.street} · {s.plz}</div>
                    <div className="rating"><StarDisplay value={average(s.ratings)} /> <span className="avg">({average(s.ratings)||"0"})</span></div>
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
