# DönerFinder 🍖🥙

Eine MERN-basierte Webanwendung, mit der Nutzer Döner-Läden in der DACH-Region finden, bewerten ⭐ und kommentieren 💬 können.  
Die App zeigt alle Läden auf einer interaktiven Karte (Leaflet) an und bietet CRUD-Operationen über eine REST API.

---

## 🚀 Live Demo

- **Frontend (Vercel):** https://meine-d-ner-app.vercel.app/
- Zugangsdaten: user / user -> kommentieren, bewerten   admin/admin -> Komm. löschen, Laden löschen, Laden hinzufügen
- **Backend (Render/Heroku):** https://meine-d-ner-app.onrender.com
- **API Test:** https://meine-d-ner-app.onrender.com/api/doener


---

## 📦 Tech Stack

- **Frontend:** React + Vite, React-Leaflet, CSS  
- **Backend:** Node.js, Express.js, Mongoose  
- **Database:** MongoDB Atlas  
- **Deployment:** Vercel (Frontend), Render (Backend)

---

## ⚙️ Installation & Setup

### Voraussetzungen
- Node.js (>=18)
- npm oder yarn
- MongoDB Atlas Account

### Schritte

1. Repo klonen:
   ```bash
   git clone https://github.com/dein-user/doenerfinder.git
   cd doenerfinder
   ```

2. `.env`-Dateien anlegen:

   **Backend (`/backend/.env`):**
   ```env
   MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/doenerfinder
   PORT=5000
   ```

   **Frontend (`/frontend/.env`):**
   ```env
   VITE_API_URL=https://dein-backend-link.onrender.com
   ```

3. Dependencies installieren:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Development starten:
   - Backend:  
     ```bash
     npm run dev
     ```
   - Frontend:  
     ```bash
     npm run dev
     ```

---

## 📖 API Endpunkte

| Methode | Endpoint                   | Beschreibung              |
|---------|-----------------------------|---------------------------|
| GET     | `/api/doener`              | Alle Döner abrufen        |
| POST    | `/api/doener`              | Neuen Döner erstellen     |
| PUT     | `/api/doener/:id`          | Döner aktualisieren       |
| DELETE  | `/api/doener/:id`          | Döner löschen             |
| POST    | `/api/doener/:id/rate`     | Bewertung hinzufügen      |
| POST    | `/api/doener/:id/comment`  | Kommentar hinzufügen      |

---

## 🗄️ Datenmodell

```js
Doener {
  name: String,
  location: String,
  coordinates: { lat: Number, lng: Number },
  image: String,
  ratings: [Number],
  comments: [
    { user: String, text: String, createdAt: Date }
  ]
}
```

---

## 🧑‍💻 Projektstruktur

```
doenerfinder/
 ├── backend/         # Express + MongoDB API
 │   ├── models/      # Mongoose Schemas
 │   ├── server.js    # Hauptserver
 │   └── seed.js      # Beispieldaten
 └── frontend/        # React + Vite App
     ├── src/
     │   ├── App.jsx  # Hauptkomponente
     │   ├── api.js   # API-Funktionen
     │   └── ...
```

---

## ✨ Features

- CRUD für Döner-Läden
- Bewertungen (1–5 Sterne)
- Kommentare mit Usernamen
- Kartenansicht mit Leaflet
- Responsive UI (Desktop/Mobile)

---

## 🔒 Sicherheit & Lessons Learned

- `.env` nicht ins Repo → `.env.example` bereitgestellt
- CORS nur auf erlaubte Domains beschränken
- Helmet & Rate-Limiting empfohlen
- Input-Validierung auf Server & Client

---

## 📌 Nächste Schritte

- Authentifizierung (JWT)
- Bild-Upload (Cloudinary)
- Suche & Pagination
- Tests (Jest + Supertest, Playwright)
- Docker-Setup
