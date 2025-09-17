// routes/import-osm.js (CommonJS)
const express = require("express");
const router = express.Router();
router.get("/import/osm/ping", (req, res) => res.json({ ok: true }));


// Node 18+: fetch ist global. Falls nicht: const fetch = (...a)=>import('node-fetch').then(m=>m.default(...a));
const Doener = require("../models/Doener");

router.post("/import/osm", async (req, res) => {
  try {
    const { south, west, north, east } = req.body || {};
    if (![south, west, north, east].every((v) => typeof v === "number")) {
      return res
        .status(400)
        .json({ message: "south, west, north, east erforderlich (Zahlen)" });
    }

    const q = `
      [out:json][timeout:25];
      (
        node["amenity"~"fast_food|restaurant"]["cuisine"~"kebab|doner|dürüm|turkish"](${south},${west},${north},${east});
        way ["amenity"~"fast_food|restaurant"]["cuisine"~"kebab|doner|dürüm|turkish"](${south},${west},${north},${east});
        rel ["amenity"~"fast_food|restaurant"]["cuisine"~"kebab|doner|dürüm|turkish"](${south},${west},${north},${east});
      );
      out center tags;
    `;

    const r = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q),
    });
    if (!r.ok) throw new Error(`Overpass ${r.status}`);
    const data = await r.json();

    const elements = Array.isArray(data.elements) ? data.elements : [];
    let upserts = 0;

    for (const el of elements) {
      const tags = el.tags || {};
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) continue;

      const name = tags.name || "Unbenannt";
      const location = [
        [tags["addr:street"], tags["addr:housenumber"]]
          .filter(Boolean)
          .join(" "),
        tags["addr:postcode"],
        tags["addr:city"],
      ]
        .filter(Boolean)
        .join(" · ");

      // stabile externe ID (z.B. "node/123456")
      const sourceId = `${el.type}/${el.id}`;

      // idempotentes Upsert: lege neu an, wenn noch nicht vorhanden
      await Doener.findOneAndUpdate(
        { sourceId }, // <— neues Feld in deinem Schema empfehlenswert
        {
          $setOnInsert: {
            name,
            location,
            coordinates: { lat, lng },
            image: "", // ggf. später befüllen
            ratings: [],
            comments: [],
            source: "osm",
            sourceId,
          },
        },
        { upsert: true, new: true }
      );
      upserts++;
    }

    res.json({ imported: upserts });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "OSM-Import fehlgeschlagen", detail: e.message });
  }
});

module.exports = router;
