const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user: { type: String, required: true, trim: true },      // Anzeigename (z.B. "User")
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const doenerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  coordinates: { lat: Number, lng: Number },
  image: { type: String, default: "" },
  ratings: { type: [Number], default: [] },
  comments: { type: [commentSchema], default: [] },        // 👈 NEU
});

module.exports = mongoose.model("Doener", doenerSchema);
