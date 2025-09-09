import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import 'leaflet/dist/leaflet.css'
import './App.css'

function App() {
  const [doener, setDoener] = useState([])
  const [editingDoener, setEditingDoener] = useState(null)
  const [formData, setFormData] = useState({ name: "", street: "", plz: "" })

  useEffect(() => {
    fetchDoener()
  }, [])

  const fetchDoener = () => {
    fetch("http://localhost:5000/api/doener")
      .then(res => res.json())
      .then(data => setDoener(data))
      .catch(err => console.error(err))
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const getCoordinates = async (address) => {
    const res = await fetch(`http://localhost:5000/api/geocode?address=${encodeURIComponent(address)}`)
    const data = await res.json()
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const location = `${formData.street}, ${formData.plz}, Zürich`
    const coordinates = await getCoordinates(location)

    if (!coordinates) {
      alert("Adresse konnte nicht gefunden werden!")
      return
    }

    const payload = { name: formData.name, location, coordinates }

    const url = editingDoener
      ? `http://localhost:5000/api/doener/${editingDoener._id}`
      : "http://localhost:5000/api/doener"

    const method = editingDoener ? "PUT" : "POST"

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(() => {
        setEditingDoener(null)
        setFormData({ name: "", street: "", plz: "" })
        fetchDoener()
      })
      .catch(err => console.error(err))
  }

  const handleEditClick = (d) => {
    setEditingDoener(d)
    const [street, plz] = d.location.split(", ")
    setFormData({ name: d.name, street, plz })
  }

  return (
    <div className="app-container">
      <h1>Döner Finder</h1>

      <div className="content">
        <div className="doener-list">
          <h2>Unsere Döner-Läden</h2>
          <ul>
            {doener.map(d => (
              <li key={d._id}>
                <strong>{d.name}</strong><br />
                {d.location}<br />
                <button onClick={() => handleEditClick(d)}>Bearbeiten</button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleSubmit}>
            <h3>{editingDoener ? "Döner-Laden bearbeiten" : "Neuen Döner-Laden hinzufügen"}</h3>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" required />
            <input name="street" value={formData.street} onChange={handleChange} placeholder="Straße" required />
            <input name="plz" value={formData.plz} onChange={handleChange} placeholder="PLZ" required />
            <button type="submit">{editingDoener ? "Aktualisieren" : "Hinzufügen"}</button>
            {editingDoener && <button type="button" onClick={() => setEditingDoener(null)}>Abbrechen</button>}
          </form>
        </div>

        <div className="doener-map">
          <MapContainer
            center={[47.3769, 8.5417]}
            zoom={13}
            style={{ height: "400px", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {doener.map(d => (
              d.coordinates && (
                <Marker key={d._id} position={[d.coordinates.lat, d.coordinates.lng]}>
                  <Popup>
                    <strong>{d.name}</strong><br />
                    {d.location}
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}

export default App
