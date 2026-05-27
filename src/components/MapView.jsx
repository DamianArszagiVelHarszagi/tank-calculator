import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

function makeStopIcon(num, virtual) {
    return L.divIcon({
        html: `<div class="marker-inner marker-stop ${virtual ? 'marker-stop-virtual' : 'marker-stop-user'}">${num}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14], className: '',
    });
}

function makeSafetyIcon(risk) {
    const cls = { green: 'marker-safety-green', yellow: 'marker-safety-yellow', red: 'marker-safety-red' };
    return L.divIcon({
        html: `<div class="marker-inner marker-safety-icon ${cls[risk] || 'marker-safety-yellow'}">!</div>`,
        iconSize: [20, 20], iconAnchor: [10, 10], className: '',
    });
}

function makeTankEmptyIcon() {
    return L.divIcon({
        html: '<div class="marker-inner marker-tank-empty">!</div>',
        iconSize: [30, 30], iconAnchor: [15, 15], className: '',
    });
}

function MapClickHandler({ onMapClick }) {
    useMapEvents({ click: (e) => onMapClick(e.latlng) });
    return null;
}

function FitBounds({ routeGeometry }) {
    const map = useMap();
    useEffect(() => {
        if (!routeGeometry) return;
        const layer = L.geoJSON(routeGeometry);
        map.fitBounds(layer.getBounds(), { padding: [30, 30] });
    }, [map, routeGeometry]);
    return null;
}

export default function MapView({ stops, routeGeometry, routeKey, fuelPlan, tankEmptyPos, safetyAnalysis, onMapClick }) {
    return (
        <MapContainer id="map" center={[50.85, 4.35]} zoom={5} zoomSnap={0} zoomDelta={0.5} wheelPxPerZoomLevel={30}>
            <TileLayer
                url="https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=JjNyIKmpReSjZ5Nb0qF1"
                attribution='© <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
                tileSize={512}
                zoomOffset={-1}
                minZoom={1}
                maxZoom={19}
            />
            <MapClickHandler onMapClick={onMapClick} />
            <FitBounds routeGeometry={routeGeometry} />

            {/* Route line */}
            {routeGeometry && (
                <GeoJSON
                    key={routeKey}
                    data={routeGeometry}
                    style={{ color: '#4fc3f7', weight: 3 }}
                />
            )}

            {/* User stops */}
            {stops.map(stop => (
                <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                    <Popup>{stop.name}</Popup>
                </Marker>
            ))}

            {/* Fuel plan stops */}
            {fuelPlan.map((stop, idx) => (
                <Marker
                    key={stop.id}
                    position={[stop.lat, stop.lng]}
                    icon={makeStopIcon(idx + 1, stop.type === 'virtual')}
                >
                    <Popup>
                        <strong>{idx + 1}. {stop.name}</strong>
                        {stop.type === 'virtual' && <><br /><em>{stop.legFrom} → {stop.legTo}</em></>}
                        <br />€{stop.price.toFixed(3)}/L<br />Volle tank: €{stop.fillUpCost.toFixed(2)}
                    </Popup>
                </Marker>
            ))}

            {/* Tank empty marker */}
            {tankEmptyPos && (
                <Marker position={[tankEmptyPos.lat, tankEmptyPos.lng]} icon={makeTankEmptyIcon()}>
                    <Popup>
                        <strong>Max bereik: ±{tankEmptyPos.kmTotal.toFixed(0)} km</strong><br />
                        Tank leeg op traject<br />
                        {tankEmptyPos.fromName} → {tankEmptyPos.toName}
                    </Popup>
                </Marker>
            )}

            {/* Safety markers */}
            {safetyAnalysis?.countries?.map((c, idx) => (
                <Marker key={`safety-${idx}`} position={[c.lat, c.lng]} icon={makeSafetyIcon(c.info?.risk)}>
                    <Popup maxWidth={260}>
                        <strong>{c.info?.name}</strong><br />
                        {c.info?.risk === 'green' ? 'Veilig' : c.info?.risk === 'red' ? 'Gevaarlijk' : 'Opletten'}
                        {c.info?.border && <><br />{c.info.border}</>}
                        {c.info?.danger && <><br /><small className="danger-text">{c.info.danger}</small></>}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
