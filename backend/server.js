const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const Doener = require("./models/Doener");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB verbunden ✅"))
  .catch(err => console.error("MongoDB-Verbindungsfehler:", err));

app.get("/", (req, res) => res.send("API läuft 🚀"));

// debug/info
app.get("/_info", (req, res) => {
  try {
    const stack = (app && app._router && app._router.stack) ? app._router.stack : [];
    const routes = [];
    for (const layer of stack) {
      if (layer && layer.route && layer.route.path) {
        const methods = layer.route.methods
          ? Object.keys(layer.route.methods).map(m => m.toUpperCase())
          : [];
        routes.push(`${methods.join(",")} ${layer.route.path}`);
      }
    }
    const hasRateRoute = routes.some(r => r.includes("POST") && r.includes("/api/doener/:id/rate"));
    res.json({ ok: true, hasRateRoute, count: routes.length, routes });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// LIST
app.get("/api/doener", async (req, res) => {
  try {
    const doener = await Doener.find();
    res.json(doener);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE  👇 übernimmt image + ratings
app.post("/api/doener", async (req, res) => {
  try {
    const { name, location, coordinates, image = "", ratings = [], comments = [] } = req.body;
    if (!name || !coordinates || typeof coordinates.lat !== "number" || typeof coordinates.lng !== "number") {
      return res.status(400).json({ message: "name und coordinates.lat/lng sind erforderlich" });
    }
    const savedDoener = await Doener.create({ name, location, coordinates, image, ratings, comments });
    res.status(201).json(savedDoener);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// UPDATE  👇 überschreibt nur Felder, die gesendet wurden (ratings & image werden nicht versehentlich gelöscht)
app.put("/api/doener/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, coordinates, image, ratings, comments } = req.body;

    const update = {};
    if (typeof name !== "undefined") update.name = name;
    if (typeof location !== "undefined") update.location = location;
    if (typeof coordinates !== "undefined") update.coordinates = coordinates;
    if (typeof image !== "undefined") update.image = image;
    if (typeof ratings !== "undefined") update.ratings = ratings;
    if (typeof comments !== "undefined") update.comments = comments;

    const updatedDoener = await Doener.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true
    });
    if (!updatedDoener) return res.status(404).json({ message: "Nicht gefunden" });
    res.json(updatedDoener);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post("/api/doener/:id/comment", async (req, res) => {
  try {
    const { id } = req.params;
    const { user, text } = req.body;
    const u = (user || "").trim();
    const t = (text || "").trim();

    if (!u || !t) return res.status(400).json({ message: "user und text sind erforderlich" });
    if (t.length > 1000) return res.status(400).json({ message: "Kommentar ist zu lang (max. 1000 Zeichen)" });

    const updated = await Doener.findByIdAndUpdate(
      id,
      { $push: { comments: { user: u, text: t, createdAt: new Date() } } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Nicht gefunden" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});



// DELETE
app.delete("/api/doener/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Doener.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// RATE (bleibt wie bei dir, passt perfekt)
app.post("/api/doener/:id/rate", async (req, res) => {
  try {
    const { id } = req.params;
    const { stars } = req.body;
    const v = Number(stars);
    if (!Number.isFinite(v) || v < 1 || v > 5) {
      return res.status(400).json({ message: "Ungültige Bewertung (1..5)" });
    }
    const updated = await Doener.findByIdAndUpdate(
      id,
      { $push: { ratings: v } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Nicht gefunden" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
