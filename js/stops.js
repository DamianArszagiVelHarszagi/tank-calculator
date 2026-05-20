function addStop(lat, lng, name, countryCode) {
    const stop = { lat, lng, countryCode, name };
    stops.push(stop);
    stop.marker = L.marker([lat, lng]).addTo(map).bindPopup(name);
    renderStops();
    updateCalcButton();
}

async function searchAddress() {
    const input = document.getElementById('address-input');
    const btn = document.getElementById('search-btn');
    const error = document.getElementById('search-error');
    const query = input.value.trim();
    if (!query) return;

    input.disabled = btn.disabled = true;
    error.textContent = '';

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=nl&addressdetails=1`
        );
        const results = await response.json();

        if (!results.length) {
            error.textContent = `"${query}" niet gevonden.`;
            return;
        }

        const r = results[0];
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        const countryCode = (r.address?.country_code || 'XX').toUpperCase();
        const city = r.address?.city || r.address?.town || r.address?.village || r.address?.county || '';
        const name = city || r.display_name.split(',')[0].trim();

        addStop(lat, lng, name, countryCode);
        map.setView([lat, lng], Math.max(map.getZoom(), 8));
        input.value = '';
        clearResults();
        clearRoute();
    } catch {
        error.textContent = 'Zoeken mislukt.';
    } finally {
        input.disabled = btn.disabled = false;
    }
}

function renderStops() {
    const list = document.getElementById("stops-list");
    if (!stops.length) {
        list.innerHTML = "<li><em>Nog geen stops</em></li>";
        return;
    }
    list.innerHTML = stops
        .map((stop, i) => `<li>${i + 1}. ${stop.name} <button onclick="removeStop(${i})">×</button></li>`)
        .join("");
}

function updateCalcButton() {
    document.getElementById("calc-btn").disabled = stops.length < 2;
}

function onMapClick(e) {
    if (lastResult) return;
    const { lat, lng } = e.latlng;
    const stop = { lat, lng, countryCode: "DEFAULT", name: "..." };
    stops.push(stop);

    stop.marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`Stop ${stops.length}`);

    renderStops();
    updateCalcButton();

    geocodeQueue = geocodeQueue.then(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
        const location = await getLocationInfo(lat, lng);
        stop.countryCode = location.countryCode;
        stop.name = location.name;
        renderStops();
    });
}

function removeStop(index) {
    if (stops[index].marker) map.removeLayer(stops[index].marker);
    stops.splice(index, 1);
    renderStops();
    updateCalcButton();
    clearResults();
    clearRoute();
}

function clearAll() {
    stops.forEach(stop => {
        if (stop.marker) map.removeLayer(stop.marker);
    });
    stops = [];
    lastResult = null;
    document.getElementById('save-btn').style.display = 'none';
    document.getElementById('safety-btn').style.display = 'none';
    document.getElementById('safety-results').innerHTML = '';
    clearRoute();
    renderStops();
    updateCalcButton();
    clearResults();
}

map.on("click", onMapClick);
