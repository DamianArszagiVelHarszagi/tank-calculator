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
        lastRouteGeometry = route.geometry;
        lastRouteLegs = route.legs;
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
        lastFuelPlan = fuelPlan;
        document.getElementById('plan-overlay').innerHTML = buildPlanHtml(fuelPlan, tankCapacity);

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

        fuelPlan.forEach((stop, idx) => {
            const popupBody = stop.type === 'virtual'
                ? `<strong>${idx + 1}. ${stop.name}</strong><br><em>${stop.legFrom} → ${stop.legTo}</em>`
                : `<strong>${idx + 1}. ${stop.name}</strong>`;
            const marker = L.marker([stop.lat, stop.lng], { icon: makeStopIcon(idx + 1, stop.type === 'virtual') })
                .addTo(map)
                .bindPopup(`${popupBody}<br>€${stop.price.toFixed(3)}/L<br>Volle tank (${tankCapacity}L): €${stop.fillUpCost.toFixed(2)}`);
            recommendedStopMarkers.push(marker);
        });

        let tankHtml = tankEmptyInfo
            ? `<p style="background:#fff3cd;padding:8px;border-radius:4px;">
                ⛽ Zonder bijvullen leeg na ±${tankEmptyInfo.kmTotal.toFixed(0)} km
                <small>(traject ${tankEmptyInfo.fromName} → ${tankEmptyInfo.toName})</small>
               </p>`
            : `<p style="background:#d4edda;padding:8px;border-radius:4px;">
                ✓ Tank houdt het vol voor de hele route (${remainingFuel.toFixed(1)}L over)
               </p>`;

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
        document.getElementById('safety-btn').style.display = '';
        document.getElementById('safety-results').innerHTML = '';

        const returnLabel = isReturn ? ' <small>(heen en terug)</small>' : '';
        const perPersonLine = persons > 1
            ? `<br>Per persoon: <strong>€${(displayCost / persons).toFixed(2)}</strong>`
            : '';

        resultsEl.innerHTML =
            `<p id="results-summary"><strong>TOTAAL: €${displayCost.toFixed(2)}</strong>${returnLabel}${perPersonLine}<br>${displayKm.toFixed(0)} km · ${displayLiters.toFixed(1)} L</p>` +
            tankHtml +
            legsHtml +
            "<p><small>Prijzen zijn schattingen (gem. 2026).</small></p>";

        geocodeVirtualStops(fuelPlan, fuelType, tankCapacity, seq, {
            stops, routeLegs: route.legs, consumption, isReturn, persons, displayKm, displayLiters,
        });

    } catch (err) {
        resultsEl.innerHTML = `<p>Fout: ${err.message}</p>`;
    }
}
