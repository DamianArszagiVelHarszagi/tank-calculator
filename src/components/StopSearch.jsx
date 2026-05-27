import { useState } from 'react';

export default function StopSearch({ onAddStop }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSearch(e) {
        e.preventDefault();
        const q = query.trim();
        if (!q || loading) return;

        setLoading(true);
        setError('');
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=nl&addressdetails=1`
            );
            const results = await resp.json();
            if (!results.length) { setError(`"${q}" niet gevonden.`); return; }
            const r = results[0];
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lon);
            const countryCode = (r.address?.country_code || 'XX').toUpperCase();
            const city = r.address?.city || r.address?.town || r.address?.village || r.address?.county || '';
            const name = city || r.display_name.split(',')[0].trim();
            onAddStop({ lat, lng, name, countryCode });
            setQuery('');
        } catch {
            setError('Zoeken mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSearch}>
            <div className="search_row">
                <input
                    className="search_input"
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Voeg een stop toe..."
                    disabled={loading}
                />
                <button type="submit" className="search_btn" disabled={loading}>
                    {loading ? '...' : 'Zoek'}
                </button>
            </div>
            {error && <small className="search_error">{error}</small>}
        </form>
    );
}
