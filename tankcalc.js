let fuelPrices = null;
const pricesReady = fetch('prices.json')
    .then(r => r.json())
    .then(data => fuelPrices = data)
    .catch(() => {
        fuelPrices = { DEFAULT: { "95": 1.65, "98": 1.78, "diesel": 1.52 } };
    });

function getPricePerLiter(countryCode, fuelType) {
    const prices = fuelPrices[countryCode] || fuelPrices.DEFAULT;
    return prices[fuelType];
}

let stops = [];
let routeLayer = null;
let tankEmptyMarker = null;
let recommendedStopMarkers = [];
let geocodeQueue = Promise.resolve();
let lastResult = null;
let geocodeSeq = 0;

function navigate(page) {
    document.getElementById('saved-page').style.display = page === 'saved' ? 'block' : 'none';
    if (page === 'saved') renderSavedRoutes();
}

function saveRoute() {
    if (!lastResult) return;
    const saved = JSON.parse(localStorage.getItem('savedRoutes') || '[]');
    saved.unshift({ id: Date.now(), date: new Date().toLocaleDateString('nl'), ...lastResult });
    localStorage.setItem('savedRoutes', JSON.stringify(saved));
    alert('Route opgeslagen!');
}

function deleteRoute(id) {
    const saved = JSON.parse(localStorage.getItem('savedRoutes') || '[]');
    localStorage.setItem('savedRoutes', JSON.stringify(saved.filter(r => r.id !== id)));
    renderSavedRoutes();
}

function loadRoute(id) {
    const saved = JSON.parse(localStorage.getItem('savedRoutes') || '[]');
    const route = saved.find(r => r.id === id);
    if (!route) return;
    navigate('calculator');
    clearAll();
    document.getElementById('fuel').value = route.fuelType;
    document.getElementById('consumption').value = route.consumption;
    document.getElementById('tank-capacity').value = route.tankCapacity;
    document.getElementById('persons').value = route.persons ?? 1;
    document.getElementById('return-trip').checked = route.isReturn ?? false;
    route.stops.forEach(s => addStop(s.lat, s.lng, s.name, s.countryCode));
    calculate();
}

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

function renderSavedRoutes() {
    const saved = JSON.parse(localStorage.getItem('savedRoutes') || '[]');
    const list = document.getElementById('saved-list');
    if (!saved.length) {
        list.innerHTML = '<li><em>Geen opgeslagen routes</em></li>';
        return;
    }
    list.innerHTML = saved.map(r => `
        <li>
            <strong>${r.stops[0].name} → ${r.stops[r.stops.length - 1].name}</strong><br>
            ${r.date} · ${r.totalKm} km · €${r.totalCost.toFixed(2)} · ${r.fuelType}<br>
            <small>Stops: ${r.stops.map(s => s.name).join(' → ')}</small><br>
            <button onclick="loadRoute(${r.id})">Laad route</button>
            <button onclick="deleteRoute(${r.id})">Verwijder</button>
        </li>
    `).join('');
}

const map = L.map("map", { center: [50.85, 4.35], zoom: 5 });
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
}).addTo(map);
map.on("click", onMapClick);

async function getLocationInfo(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=nl`
        );
        const data = await response.json();
        const countryCode = (data.address?.country_code || "XX").toUpperCase();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
        const country = data.address?.country || "Onbekend";
        return {
            countryCode,
            name: city || country,
            display: city ? `${city}, ${country}` : country,
        };
    } catch {
        return {
            countryCode: "DEFAULT",
            name: `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
            display: "",
        };
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

function clearResults() {
    document.getElementById("results").innerHTML = "";
}

function clearTankMarkers() {
    if (tankEmptyMarker) { map.removeLayer(tankEmptyMarker); tankEmptyMarker = null; }
    recommendedStopMarkers.forEach(m => map.removeLayer(m));
    recommendedStopMarkers = [];
}

function clearRoute() {
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    clearTankMarkers();
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPointAtDistanceKm(geometry, targetKm) {
    const coords = geometry.coordinates;
    let accumulated = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        const [lng1, lat1] = coords[i];
        const [lng2, lat2] = coords[i + 1];
        const d = haversineKm(lat1, lng1, lat2, lng2);
        if (accumulated + d >= targetKm) {
            const t = (targetKm - accumulated) / d;
            return { lat: lat1 + t * (lat2 - lat1), lng: lng1 + t * (lng2 - lng1) };
        }
        accumulated += d;
    }
    const last = coords[coords.length - 1];
    return { lat: last[1], lng: last[0] };
}

// For each tank-range segment:
// - use the cheapest existing intermediate waypoint if one falls within range
// - otherwise auto-generate a stop at 80% of range; price = average of the two bounding stops (no geocoding)
function planFuelStops(geometry, stops, routeLegs, tankCapacity, consumption, fuelType) {
    const range = (tankCapacity / consumption) * 100;

    const stopKm = [0];
    let cum = 0;
    for (const leg of routeLegs) {
        cum += leg.distance / 1000;
        stopKm.push(cum);
    }
    const totalKm = cum;

    const plan = [];
    let lastFillKm = 0;
    let iterations = 0;

    while (lastFillKm + range < totalKm && iterations++ < 50) {
        const candidates = [];
        for (let i = 1; i < stops.length - 1; i++) {
            if (stopKm[i] > lastFillKm && stopKm[i] <= lastFillKm + range) {
                candidates.push({
                    type: 'waypoint',
                    km: stopKm[i],
                    price: getPricePerLiter(stops[i].countryCode, fuelType),
                    name: stops[i].name,
                    lat: stops[i].lat,
                    lng: stops[i].lng,
                });
            }
        }

        if (candidates.length > 0) {
            const best = candidates.reduce((a, b) => a.price <= b.price ? a : b);
            plan.push({ ...best, fillUpCost: tankCapacity * best.price });
            lastFillKm = best.km;
        } else {
            const fillKm = lastFillKm + range * 0.8;
            const point = getPointAtDistanceKm(geometry, fillKm);

            // Find which leg this km falls within and average its two countries' prices
            let legIdx = routeLegs.length - 1;
            for (let i = 0; i < stopKm.length - 1; i++) {
                if (fillKm >= stopKm[i] && fillKm <= stopKm[i + 1]) { legIdx = i; break; }
            }
            const price = (getPricePerLiter(stops[legIdx].countryCode, fuelType) +
                           getPricePerLiter(stops[legIdx + 1].countryCode, fuelType)) / 2;

            plan.push({
                type: 'virtual',
                km: fillKm,
                price,
                name: `~km ${Math.round(fillKm)}`,
                legFrom: stops[legIdx].name,
                legTo: stops[legIdx + 1].name,
                lat: point.lat,
                lng: point.lng,
                fillUpCost: tankCapacity * price,
            });
            lastFillKm = fillKm;
        }
    }

    return plan;
}

function buildPlanHtml(fuelPlan, tankCapacity) {
    if (!fuelPlan.length) return '';
    const pending = fuelPlan.filter(s => s.type === 'virtual' && !s.geocoded).length;
    const spinner = pending ? `<span class="spinner">⟳</span> Prijzen ophalen (${pending} resterend)...` : '✓ Alle prijzen bijgewerkt';
    const legend = `<small style="color:#888">● groen = jouw stop &nbsp; ● oranje = aanbevolen tussenstop</small>`;
    const items = fuelPlan.map((s, i) => {
        const label = s.type === 'virtual'
            ? `<span style="color:#e67e22">${s.name}</span>${!s.geocoded ? ' <small style="color:#aaa">(schatting)</small>' : ''}`
            : `<strong>${s.name}</strong>`;
        return `<p style="margin:4px 0;">${i + 1}. ${label} · km ${s.km.toFixed(0)}<br>
            €${s.price.toFixed(3)}/L · volle tank: <strong>€${s.fillUpCost.toFixed(2)}</strong></p>`;
    }).join('');
    return `<div style="background:#e8f4fd;padding:8px;border-radius:4px;margin-bottom:6px;">
        <strong>Tankplan (${fuelPlan.length} stop${fuelPlan.length > 1 ? 's' : ''}):</strong>
        <span style="font-size:0.85em;color:#555;margin-left:6px">${spinner}</span><br>
        ${items}${legend}
    </div>`;
}

// After geocoding, recalculate total cost using each fill-up's real price per segment.
function calcTotalFromPlan(fuelPlan, routeStops, routeLegs, consumption, fuelType) {
    const totalKm = routeLegs.reduce((s, l) => s + l.distance / 1000, 0);
    const checkpoints = [{ km: 0, price: getPricePerLiter(routeStops[0].countryCode, fuelType) }];
    for (const stop of fuelPlan) checkpoints.push({ km: stop.km, price: stop.price });
    let cost = 0;
    for (let i = 0; i < checkpoints.length; i++) {
        const endKm = i + 1 < checkpoints.length ? checkpoints[i + 1].km : totalKm;
        cost += (endKm - checkpoints[i].km) * consumption / 100 * checkpoints[i].price;
    }
    return cost;
}

async function geocodeVirtualStops(fuelPlan, fuelType, tankCapacity, seq, ctx) {
    for (let i = 0; i < fuelPlan.length; i++) {
        const stop = fuelPlan[i];
        if (stop.type !== 'virtual') continue;
        if (geocodeSeq !== seq) return;

        await new Promise(r => setTimeout(r, 1100));
        if (geocodeSeq !== seq) return;

        const info = await getLocationInfo(stop.lat, stop.lng);
        if (info.countryCode !== 'DEFAULT' && info.countryCode !== 'XX') {
            stop.price = getPricePerLiter(info.countryCode, fuelType);
            stop.name = info.display || info.name;
            stop.fillUpCost = tankCapacity * stop.price;
            stop.geocoded = true;

            const marker = recommendedStopMarkers[i];
            if (marker) {
                marker.setPopupContent(
                    `<strong>${i + 1}. ${stop.name}</strong><br>€${stop.price.toFixed(3)}/L<br>Volle tank (${tankCapacity}L): €${stop.fillUpCost.toFixed(2)}`
                );
            }
        }

        const planEl = document.getElementById('plan-section');
        if (planEl) planEl.innerHTML = buildPlanHtml(fuelPlan, tankCapacity);
    }

    // All stops geocoded — recalculate total cost from real segment prices
    if (geocodeSeq !== seq) return;
    const newCost = calcTotalFromPlan(fuelPlan, ctx.stops, ctx.routeLegs, ctx.consumption, fuelType);
    const displayCost = ctx.isReturn ? newCost * 2 : newCost;
    const summaryEl = document.getElementById('results-summary');
    if (summaryEl) {
        const returnLabel = ctx.isReturn ? ' <small>(heen en terug)</small>' : '';
        const perPersonLine = ctx.persons > 1
            ? `<br>Per persoon: <strong>€${(displayCost / ctx.persons).toFixed(2)}</strong>`
            : '';
        summaryEl.innerHTML =
            `<strong>TOTAAL: €${displayCost.toFixed(2)}</strong>${returnLabel}${perPersonLine}<br>${ctx.displayKm.toFixed(0)} km · ${ctx.displayLiters.toFixed(1)} L`;
    }
}

function makeStopIcon(num, virtual) {
    const bg = virtual ? '#e67e22' : '#27ae60';
    return L.divIcon({
        html: `<div style="background:${bg};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)">${num}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14], className: ''
    });
}

function onMapClick(e) {
    const { lat, lng } = e.latlng;
    const stop = { lat, lng, countryCode: "DEFAULT", name: "..." };
    stops.push(stop);

    stop.marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`Stop ${stops.length}`);

    renderStops();
    updateCalcButton();
    clearResults();
    clearRoute();

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
    clearRoute();
    renderStops();
    updateCalcButton();
    clearResults();
}

async function calculate() {
    if (stops.length < 2) return;

    await pricesReady;

    const consumption = parseFloat(document.getElementById("consumption").value) || 7;
    const fuelType = document.getElementById("fuel").value;
    const tankCapacity = parseFloat(document.getElementById("tank-capacity").value) || 50;
    const persons = Math.max(1, parseInt(document.getElementById("persons").value) || 1);
    const isReturn = document.getElementById("return-trip").checked;
    const resultsEl = document.getElementById("results");

    const seq = ++geocodeSeq;
    resultsEl.innerHTML = "<p>Route berekenen...</p>";
    clearRoute();

    const coordsString = stops.map(s => `${s.lng},${s.lat}`).join(";");

    try {
        const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        if (!data.routes?.length) {
            resultsEl.innerHTML = "<p>Geen route gevonden.</p>";
            return;
        }

        const route = data.routes[0];
        routeLayer = L.geoJSON(route.geometry, {
            style: { color: "blue", weight: 3 },
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });

        let totalKm = 0, totalLiters = 0, totalCost = 0;
        let legsHtml = "<hr>";
        let remainingFuel = tankCapacity;
        let tankEmptyInfo = null;

        for (let i = 0; i < route.legs.length; i++) {
            const km = route.legs[i].distance / 1000;
            const from = stops[i];
            const to = stops[i + 1];
            const avgPrice = (getPricePerLiter(from.countryCode, fuelType) + getPricePerLiter(to.countryCode, fuelType)) / 2;
            const liters = (km / 100) * consumption;
            const cost = liters * avgPrice;

            totalKm += km;
            totalLiters += liters;
            totalCost += cost;

            if (tankEmptyInfo === null && remainingFuel < liters) {
                const kmUntilEmpty = (remainingFuel / consumption) * 100;
                tankEmptyInfo = {
                    fromName: from.name,
                    toName: to.name,
                    kmTotal: totalKm - km + kmUntilEmpty,
                    pricePerLiter: getPricePerLiter(from.countryCode, fuelType),
                    fillUpCost: tankCapacity * getPricePerLiter(from.countryCode, fuelType),
                };
            }

            remainingFuel = Math.max(0, remainingFuel - liters);

            legsHtml += `<p><strong>${from.name} → ${to.name}</strong><br>
                Afstand: ${km.toFixed(0)} km<br>
                Prijs/liter: €${avgPrice.toFixed(3)}<br>
                Verbruik: ${liters.toFixed(1)} L<br>
                Kosten: €${cost.toFixed(2)}</p><hr>`;
        }

        const fuelPlan = planFuelStops(route.geometry, stops, route.legs, tankCapacity, consumption, fuelType);

        // Red ⛽ marker at the no-stop max range point
        if (tankEmptyInfo) {
            const emptyPoint = getPointAtDistanceKm(route.geometry, tankEmptyInfo.kmTotal);
            const emptyIcon = L.divIcon({
                html: '<div style="background:#e74c3c;color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)">⛽</div>',
                iconSize: [30, 30], iconAnchor: [15, 15], className: ''
            });
            tankEmptyMarker = L.marker([emptyPoint.lat, emptyPoint.lng], { icon: emptyIcon })
                .addTo(map)
                .bindPopup(`<strong>Max bereik: ±${tankEmptyInfo.kmTotal.toFixed(0)} km</strong><br>Tank leeg op traject<br>${tankEmptyInfo.fromName} → ${tankEmptyInfo.toName}`);
        }

        // Numbered markers: orange = auto-generated, green = your waypoint
        fuelPlan.forEach((stop, idx) => {
            const popupBody = stop.type === 'virtual'
                ? `<strong>${idx + 1}. ${stop.name}</strong><br><em>${stop.legFrom} → ${stop.legTo}</em>`
                : `<strong>${idx + 1}. ${stop.name}</strong>`;
            const marker = L.marker([stop.lat, stop.lng], { icon: makeStopIcon(idx + 1, stop.type === 'virtual') })
                .addTo(map)
                .bindPopup(`${popupBody}<br>€${stop.price.toFixed(3)}/L<br>Volle tank (${tankCapacity}L): €${stop.fillUpCost.toFixed(2)}`);
            recommendedStopMarkers.push(marker);
        });

        // Tank status
        let tankHtml = tankEmptyInfo
            ? `<p style="background:#fff3cd;padding:8px;border-radius:4px;">
                ⛽ Zonder bijvullen leeg na ±${tankEmptyInfo.kmTotal.toFixed(0)} km
                <small>(traject ${tankEmptyInfo.fromName} → ${tankEmptyInfo.toName})</small>
               </p>`
            : `<p style="background:#d4edda;padding:8px;border-radius:4px;">
                ✓ Tank houdt het vol voor de hele route (${remainingFuel.toFixed(1)}L over)
               </p>`;

        const planHtml = `<div id="plan-section">${buildPlanHtml(fuelPlan, tankCapacity)}</div>`;

        const displayKm = isReturn ? totalKm * 2 : totalKm;
        const displayLiters = isReturn ? totalLiters * 2 : totalLiters;
        const displayCost = isReturn ? totalCost * 2 : totalCost;

        lastResult = {
            stops: stops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng, countryCode: s.countryCode })),
            fuelType,
            consumption,
            tankCapacity,
            persons,
            isReturn,
            totalKm: Math.round(displayKm),
            totalCost: displayCost,
            totalLiters: parseFloat(displayLiters.toFixed(1)),
        };
        document.getElementById('save-btn').style.display = '';

        const returnLabel = isReturn ? ' <small>(heen en terug)</small>' : '';
        const perPersonLine = persons > 1
            ? `<br>Per persoon: <strong>€${(displayCost / persons).toFixed(2)}</strong>`
            : '';

        resultsEl.innerHTML =
            `<p id="results-summary"><strong>TOTAAL: €${displayCost.toFixed(2)}</strong>${returnLabel}${perPersonLine}<br>${displayKm.toFixed(0)} km · ${displayLiters.toFixed(1)} L</p>` +
            tankHtml +
            planHtml +
            legsHtml +
            "<p><small>Prijzen zijn schattingen (gem. 2026).</small></p>";

        geocodeVirtualStops(fuelPlan, fuelType, tankCapacity, seq, {
            stops, routeLegs: route.legs, consumption, isReturn, persons, displayKm, displayLiters,
        });

    } catch (err) {
        resultsEl.innerHTML = `<p>Fout: ${err.message}</p>`;
    }
}
