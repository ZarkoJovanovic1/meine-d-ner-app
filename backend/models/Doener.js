const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DoenerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, default: "" },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    image: { type: String, default: "" },
    ratings: { type: [Number], default: [] },
    comments: { type: [CommentSchema], default: [] },

    // ✅ NEU: für automatische Importe / Deduplikation
    source:   { type: String, default: "manual" },          // "manual" | "osm" | "fsq" | ...
    sourceId: { type: String, unique: true, sparse: true }, // z.B. "node/123"
  },
  { timestamps: true }
);



module.exports = mongoose.model("Doener", DoenerSchema);
