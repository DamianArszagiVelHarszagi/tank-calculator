const KEY = 'savedRoutes';

export function getSavedRoutes() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
}

export function saveRouteToStorage(result) {
    const saved = getSavedRoutes();
    const entry = { id: Date.now(), date: new Date().toLocaleDateString('nl'), ...result };
    saved.unshift(entry);
    const serialized = JSON.stringify(saved);
    if (serialized.length > 4 * 1024 * 1024) return false;
    localStorage.setItem(KEY, serialized);
    return true;
}

export function deleteRouteFromStorage(id) {
    const saved = getSavedRoutes();
    localStorage.setItem(KEY, JSON.stringify(saved.filter(r => r.id !== id)));
}
