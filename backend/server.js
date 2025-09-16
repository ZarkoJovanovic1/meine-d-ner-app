const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()
const Doener = require("./models/Doener")

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB verbunden ✅"))
  .catch(err => console.error("MongoDB-Verbindungsfehler:", err))

app.get("/", (req, res) => res.send("API läuft 🚀"))

// Debug: zeigt registrierte Routen
app.get("/_info", (req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods).map((x) => x.toUpperCase());
      routes.push(`${methods.join(",")} ${m.route.path}`);
    }
  });
  res.json({ hasRateRoute: routes.includes("POST /api/doener/:id/rate"), routes });
});


app.get("/api/doener", async (req, res) => {
  try {
    const doener = await Doener.find()
    res.json(doener)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

app.post("/api/doener", async (req, res) => {
  const { name, location, coordinates } = req.body
  const newDoener = new Doener({ name, location, coordinates })
  try {
    const savedDoener = await newDoener.save()
    res.status(201).json(savedDoener)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})


app.put("/api/doener/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { name, location, coordinates } = req.body
    const updatedDoener = await Doener.findByIdAndUpdate(
      id,
      { name, location, coordinates },
      { new: true }
    )
    res.json(updatedDoener)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

app.delete("/api/doener/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Doener.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

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
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`))
