const mongoose = require("mongoose");

const doenerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  coordinates: {
    lat: Number,
    lng: Number
  }
});

module.exports = mongoose.model("Doener", doenerSchema);
