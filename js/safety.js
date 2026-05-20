async function loadSafetyData() {
    if (safetyData) return safetyData;
    try {
        const r = await fetch('data/safety.json');
        safetyData = await r.json();
    } catch {
        safetyData = {};
    }
    return safetyData;
}

function buildSafetyPopup(info) {
    const RISK = { green: '🟢 Veilig', yellow: '🟡 Opletten', red: '🔴 Gevaarlijk' };
    let html = `<strong>${info.name}</strong> — ${RISK[info.risk] || '🟡'}<br>`;
    if (info.border) html += `<br>${info.border}`;
    if (info.danger) html += `<br><small style="color:#c0392b">${info.danger}</small>`;
    return html;
}

async function analyzeSafety() {
    if (!lastResult || !lastRouteGeometry) return;

    const safetyEl = document.getElementById('safety-results');
    clearSafetyMarkers();

    const data = await loadSafetyData();
    const seq = geocodeSeq;

    const stopKm = [0];
    let totalKm = 0;
    for (const leg of lastRouteLegs) { totalKm += leg.distance / 1000; stopKm.push(totalKm); }

    const knownPoints = new Map();
    for (let i = 0; i < lastResult.stops.length; i++) {
        const s = lastResult.stops[i];
        if (s.countryCode && s.countryCode !== 'DEFAULT' && s.countryCode !== 'XX')
            knownPoints.set(stopKm[i], { cc: s.countryCode, lat: s.lat, lng: s.lng });
    }
    for (const fp of lastFuelPlan) {
        if (fp.countryCode && fp.countryCode !== 'DEFAULT' && fp.countryCode !== 'XX')
            knownPoints.set(fp.km, { cc: fp.countryCode, lat: fp.lat, lng: fp.lng });
    }

    function renderAnalysis(scanning, done = 0, total = 0) {
        const sorted = [...knownPoints.entries()].sort((a, b) => a[0] - b[0]);
        const seen = new Set();
        const detected = [];
        for (const [, p] of sorted) {
            if (!seen.has(p.cc)) { seen.add(p.cc); detected.push(p); }
        }

        clearSafetyMarkers();
        for (const { cc, lat, lng } of detected) {
            const info = data[cc] || data['DEFAULT'];
            if (!info) continue;
            const m = L.marker([lat, lng], { icon: makeSafetyIcon(info.risk) })
                .addTo(map)
                .bindPopup(buildSafetyPopup(info), { maxWidth: 260 });
            safetyMarkers.push(m);
        }

        const RISK = { green: '🟢 Veilig', yellow: '🟡 Opletten', red: '🔴 Gevaarlijk' };
        const riskOrder = { green: 0, yellow: 1, red: 2 };
        let overallRisk = 'green';

        let html = '<div style="background:#f8f9fa;padding:10px;border-radius:4px;border-left:3px solid #e74c3c;margin-top:10px">';
        html += `<strong>Veiligheidsanalyse</strong>`;
        if (scanning) html += ` <span class="spinner" style="font-size:0.85em">⟳</span> <small style="color:#888">${done}/${total}</small>`;
        html += '<br><br>';

        for (const { cc } of detected) {
            const info = data[cc] || data['DEFAULT'];
            if (!info) continue;
            if (riskOrder[info.risk] > riskOrder[overallRisk]) overallRisk = info.risk;
            html += `<p style="margin:8px 0"><strong>${RISK[info.risk] || '🟡'} — ${info.name || cc}</strong>`;
            if (info.border)    html += `<br><small><em>Grens:</em> ${info.border}</small>`;
            if (info.danger)    html += `<br><small><em>Gevaar:</em> ${info.danger}</small>`;
            if (info.traffic)   html += `<br><small><em>Verkeer:</em> ${info.traffic}</small>`;
            if (info.practical) html += `<br><small><em>Praktisch:</em> ${info.practical}</small>`;
            html += '</p><hr style="margin:4px 0;border:none;border-top:1px solid #ddd">';
        }

        html += `<p style="margin-top:8px"><strong>Eindoordeel: ${RISK[overallRisk]}</strong></p>`;
        html += '</div>';
        safetyEl.innerHTML = html;
    }

    const interval = 120;
    const totalSamples = Math.max(1, Math.ceil((totalKm - interval) / interval));
    let completedSamples = 0;

    renderAnalysis(true, 0, totalSamples);

    for (let km = interval; km < totalKm; km += interval) {
        if (geocodeSeq !== seq) return;
        await new Promise(r => setTimeout(r, 1000));
        if (geocodeSeq !== seq) return;

        const point = getPointAtDistanceKm(lastRouteGeometry, km);
        const info = await getLocationInfo(point.lat, point.lng);
        const cc = info.countryCode;
        completedSamples++;

        if (cc && cc !== 'DEFAULT' && cc !== 'XX') {
            knownPoints.set(km, { cc, lat: point.lat, lng: point.lng });
        }
        renderAnalysis(km + interval < totalKm, completedSamples, totalSamples);
    }

    if (geocodeSeq === seq) renderAnalysis(false);
}
