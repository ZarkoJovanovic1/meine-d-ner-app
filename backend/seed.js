require("dotenv").config();
const mongoose = require("mongoose");
const Doener = require("./models/Doener");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB verbunden ✅");

    const testDoeners = [
      { name: "Döner King", location: "Bahnhofstrasse 1, Zürich", coordinates: { lat: 47.378, lng: 8.540 } },
      { name: "Kebab House", location: "Langstrasse 50, Zürich", coordinates: { lat: 47.378, lng: 8.540 } }
    ];

    await Doener.deleteMany({});
    await Doener.insertMany(testDoeners);

    console.log("Test-Döner eingefügt ✅");
    mongoose.connection.close();
  })
  .catch(err => console.error(err));
