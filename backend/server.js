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

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`))
