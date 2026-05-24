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
                    countryCode: stops[i].countryCode,
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
    const statusMsg = pending
        ? `<span class="spinner">⟳</span> Prijzen ophalen (${pending} resterend)...`
        : '✓ Alle prijzen bijgewerkt';
    const items = fuelPlan.map((s, i) => {
        const nameHtml = s.type === 'virtual'
            ? `<span class="stop-virtual">${s.name}</span>${!s.geocoded ? ' <small class="stop-estimate">(schatting)</small>' : ''}`
            : `<strong>${s.name}</strong>`;
        return `<p class="plan-item">${i + 1}. ${nameHtml} · km ${s.km.toFixed(0)}<br>€${s.price.toFixed(3)}/L · volle tank: <strong>€${s.fillUpCost.toFixed(2)}</strong></p>`;
    }).join('');
    return `<div class="plan-box">
        <strong>Tankplan (${fuelPlan.length} stop${fuelPlan.length > 1 ? 's' : ''}):</strong>
        <span class="plan-status">${statusMsg}</span><br>
        ${items}
        <small class="plan-legend">● groen = jouw stop &nbsp; ● oranje = aanbevolen tussenstop</small>
    </div>`;
}

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
            stop.countryCode = info.countryCode;
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

        const planEl = document.getElementById('plan-overlay');
        if (planEl) planEl.innerHTML = buildPlanHtml(fuelPlan, tankCapacity);
    }

    if (geocodeSeq !== seq) return;
    const newOutboundCost = calcTotalFromPlan(fuelPlan, ctx.stops, ctx.routeLegs, ctx.consumption, fuelType);
    const displayCost = newOutboundCost + (ctx.returnCost || 0);
    const summaryEl = document.getElementById('results-summary');
    if (summaryEl) {
        const breakdownLine = ctx.isReturn
            ? `<br><small>Heen: €${newOutboundCost.toFixed(2)} · Terug: €${(ctx.returnCost || 0).toFixed(2)}</small>`
            : '';
        const perPersonLine = ctx.persons > 1
            ? `<br>Per persoon: <strong>€${(displayCost / ctx.persons).toFixed(2)}</strong>`
            : '';
        summaryEl.innerHTML =
            `<strong>TOTAAL: €${displayCost.toFixed(2)}</strong>${breakdownLine}${perPersonLine}<br>${ctx.displayKm.toFixed(0)} km · ${ctx.displayLiters.toFixed(1)} L`;
    }
}
