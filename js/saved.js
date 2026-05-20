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
