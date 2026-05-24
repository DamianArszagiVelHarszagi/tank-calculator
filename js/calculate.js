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
    const reverseCoords = isReturn
        ? stops.slice().reverse().map(s => `${s.lng},${s.lat}`).join(";")
        : null;

    try {
        // Fetch outbound and return routes in parallel
        const [data, reverseData] = await Promise.all([
            fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`)
                .then(r => r.json()),
            reverseCoords
                ? fetch(`https://router.project-osrm.org/route/v1/driving/${reverseCoords}?overview=full&geometries=geojson`)
                    .then(r => r.json())
                    .catch(() => null)
                : Promise.resolve(null),
        ]);

        if (!data.routes?.length) {
            resultsEl.innerHTML = "<p>Geen route gevonden.</p>";
            return;
        }

        const route = data.routes[0];
        lastRouteGeometry = route.geometry;
        lastRouteLegs = route.legs;
        routeLayer = L.geoJSON(route.geometry, { style: { color: "blue", weight: 3 } }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });

        // ── Outbound ──
        let totalKm = 0, totalLiters = 0, totalCost = 0;
        let legsHtml = "<hr>";
        let remainingFuel = tankCapacity;
        let tankEmptyInfo = null;

        for (let i = 0; i < route.legs.length; i++) {
            const km = route.legs[i].distance / 1000;
            const from = stops[i];
            const to = stops[i + 1];
            const crossBorder = from.countryCode !== to.countryCode;
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
                };
            }
            remainingFuel = Math.max(0, remainingFuel - liters);

            legsHtml += `<p class="leg-item"><strong>${from.name} → ${to.name}</strong><br>
                ${km.toFixed(0)} km · €${avgPrice.toFixed(3)}/L · ${liters.toFixed(1)} L · <strong>€${cost.toFixed(2)}</strong>
                ${crossBorder ? `<br><span class="leg-cross-border">↳ grensoversteek ${from.countryCode} → ${to.countryCode}</span>` : ''}
                </p><hr>`;
        }

        // ── Return route ──
        let returnKm = 0, returnLiters = 0, returnCost = 0;
        if (isReturn) {
            if (reverseData?.routes?.length) {
                const reverseLegs = reverseData.routes[0].legs;
                const reverseStops = stops.slice().reverse();
                for (let i = 0; i < reverseLegs.length; i++) {
                    const km = reverseLegs[i].distance / 1000;
                    const from = reverseStops[i];
                    const to = reverseStops[i + 1];
                    const avgPrice = (getPricePerLiter(from.countryCode, fuelType) + getPricePerLiter(to.countryCode, fuelType)) / 2;
                    returnKm += km;
                    returnLiters += (km / 100) * consumption;
                    returnCost += (km / 100) * consumption * avgPrice;
                }
            } else {
                // Fallback: mirror outbound
                returnKm = totalKm;
                returnLiters = totalLiters;
                returnCost = totalCost;
            }
        }

        const displayKm = totalKm + returnKm;
        const displayLiters = totalLiters + returnLiters;
        const displayCost = totalCost + returnCost;

        // ── Fuel plan (outbound) ──
        const fuelPlan = planFuelStops(route.geometry, stops, route.legs, tankCapacity, consumption, fuelType);
        lastFuelPlan = fuelPlan;
        document.getElementById('plan-overlay').innerHTML = buildPlanHtml(fuelPlan, tankCapacity);

        // ── Tank empty marker ──
        if (tankEmptyInfo) {
            const emptyPoint = getPointAtDistanceKm(route.geometry, tankEmptyInfo.kmTotal);
            tankEmptyMarker = L.marker([emptyPoint.lat, emptyPoint.lng], {
                icon: L.divIcon({
                    html: '<div class="marker-inner marker-tank-empty">⛽</div>',
                    iconSize: [30, 30], iconAnchor: [15, 15], className: ''
                })
            }).addTo(map).bindPopup(
                `<strong>Max bereik: ±${tankEmptyInfo.kmTotal.toFixed(0)} km</strong><br>Tank leeg op traject<br>${tankEmptyInfo.fromName} → ${tankEmptyInfo.toName}`
            );
        }

        // ── Fuel stop markers ──
        fuelPlan.forEach((stop, idx) => {
            const popupBody = stop.type === 'virtual'
                ? `<strong>${idx + 1}. ${stop.name}</strong><br><em>${stop.legFrom} → ${stop.legTo}</em>`
                : `<strong>${idx + 1}. ${stop.name}</strong>`;
            recommendedStopMarkers.push(
                L.marker([stop.lat, stop.lng], { icon: makeStopIcon(idx + 1, stop.type === 'virtual') })
                    .addTo(map)
                    .bindPopup(`${popupBody}<br>€${stop.price.toFixed(3)}/L<br>Volle tank (${tankCapacity}L): €${stop.fillUpCost.toFixed(2)}`)
            );
        });

        // ── Tank status ──
        const tankHtml = tankEmptyInfo
            ? `<p class="tank-warning">⛽ Zonder bijvullen leeg na ±${tankEmptyInfo.kmTotal.toFixed(0)} km<br><small>(${tankEmptyInfo.fromName} → ${tankEmptyInfo.toName})</small></p>`
            : `<p class="tank-ok">✓ Tank houdt het vol (${remainingFuel.toFixed(1)} L over bij aankomst)</p>`;

        lastResult = {
            stops: stops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng, countryCode: s.countryCode })),
            fuelType, consumption, tankCapacity, persons, isReturn,
            totalKm: Math.round(displayKm),
            totalCost: displayCost,
            totalLiters: parseFloat(displayLiters.toFixed(1)),
        };
        document.getElementById('save-btn').style.display = '';
        document.getElementById('safety-btn').style.display = '';
        document.getElementById('safety-results').innerHTML = '';

        const breakdownLine = isReturn
            ? `<br><small>Heen: €${totalCost.toFixed(2)} · Terug: €${returnCost.toFixed(2)}</small>`
            : '';
        const perPersonLine = persons > 1
            ? `<br>Per persoon: <strong>€${(displayCost / persons).toFixed(2)}</strong>`
            : '';

        resultsEl.innerHTML =
            `<p id="results-summary"><strong>TOTAAL: €${displayCost.toFixed(2)}</strong>${breakdownLine}${perPersonLine}<br>${displayKm.toFixed(0)} km · ${displayLiters.toFixed(1)} L</p>` +
            tankHtml +
            legsHtml +
            '<p><small>Prijzen zijn schattingen (gem. 2026).</small></p>';

        geocodeVirtualStops(fuelPlan, fuelType, tankCapacity, seq, {
            stops, routeLegs: route.legs, consumption,
            returnCost, isReturn, persons, displayKm, displayLiters,
        });

    } catch (err) {
        resultsEl.innerHTML = `<p>Fout: ${err.message}</p>`;
    }
}
