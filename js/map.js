const map = L.map("map", { center: [50.85, 4.35], zoom: 5 });
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
}).addTo(map);

function makeStopIcon(num, virtual) {
    const bg = virtual ? '#e67e22' : '#27ae60';
    return L.divIcon({
        html: `<div style="background:${bg};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)">${num}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14], className: ''
    });
}

function makeSafetyIcon(risk) {
    const colors = { green: '#27ae60', yellow: '#e67e22', red: '#e74c3c' };
    const bg = colors[risk] || colors.yellow;
    return L.divIcon({
        html: `<div style="background:${bg};color:white;border-radius:3px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)">!</div>`,
        iconSize: [20, 20], iconAnchor: [10, 10], className: ''
    });
}

function clearResults() {
    document.getElementById("results").innerHTML = "";
    document.getElementById("plan-overlay").innerHTML = "";
    document.getElementById("safety-results").innerHTML = "";
}

function clearTankMarkers() {
    if (tankEmptyMarker) { map.removeLayer(tankEmptyMarker); tankEmptyMarker = null; }
    recommendedStopMarkers.forEach(m => map.removeLayer(m));
    recommendedStopMarkers = [];
}

function clearSafetyMarkers() {
    safetyMarkers.forEach(m => map.removeLayer(m));
    safetyMarkers = [];
}

function clearRoute() {
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    clearTankMarkers();
    clearSafetyMarkers();
    lastRouteGeometry = null;
    lastRouteLegs = [];
}
