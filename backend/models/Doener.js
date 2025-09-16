const mongoose = require("mongoose");

const doenerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  coordinates: {
    lat: Number,
    lng: Number
  },
  // ⭐ Bewertung INS Schema einfügen
  bewertung: { type: Number, min: 1, max: 5, default: 3 }
});

module.exports = mongoose.model("Doener", doenerSchema);
