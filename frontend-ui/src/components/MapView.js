import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// Fix for default marker icons in CRA+Leaflet:
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

export default function MapView({ days }) {
    if (!days || days.length === 0) return null;

    // Center map on first day's coords
    const { lat, lng } = days[0].coords;

    return (
        <MapContainer
            center={[lat, lng]}
            zoom={12}
            style={{ height: '500px', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://osm.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {days.map((day, idx) => (
                <Marker key={idx} position={[day.coords.lat, day.coords.lng]}>
                    <Popup>
                        <strong>Day {idx + 1}</strong><br />
                        {day.description}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
