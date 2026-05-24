const map = L.map("map", { center: [50.85, 4.35], zoom: 5 });
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
}).addTo(map);

function makeStopIcon(num, virtual) {
    return L.divIcon({
        html: `<div class="marker-inner marker-stop ${virtual ? 'marker-stop-virtual' : 'marker-stop-user'}">${num}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14], className: ''
    });
}

function makeSafetyIcon(risk) {
    const cls = { green: 'marker-safety-green', yellow: 'marker-safety-yellow', red: 'marker-safety-red' };
    return L.divIcon({
        html: `<div class="marker-inner marker-safety-icon ${cls[risk] || 'marker-safety-yellow'}">!</div>`,
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
