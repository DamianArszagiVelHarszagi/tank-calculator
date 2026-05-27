import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSavedRoutes, deleteRouteFromStorage } from '../utils/storage';

export default function SavedRoutes({ onLoad }) {
    const [routes, setRoutes] = useState([]);

    useEffect(() => {
        setRoutes(getSavedRoutes());
    }, []);

    function handleDelete(id) {
        deleteRouteFromStorage(id);
        setRoutes(getSavedRoutes());
    }

    return (
        <div id="saved-page">
            <div id="saved-header">
                <Link to="/" className="nav-btn">← Terug</Link>
                <h2>Opgeslagen routes</h2>
            </div>
            <ul id="saved-list">
                {!routes.length
                    ? <li><em>Geen opgeslagen routes</em></li>
                    : routes.map(r => (
                        <li key={r.id}>
                            <strong>{r.stops[0].name} → {r.stops[r.stops.length - 1].name}</strong><br />
                            {r.date} · {r.totalKm} km · €{r.totalCost.toFixed(2)} · {r.fuelType}<br />
                            <small>Stops: {r.stops.map(s => s.name).join(' → ')}</small><br />
                            <button onClick={() => onLoad(r)}>Laad route</button>
                            {' '}
                            <button onClick={() => handleDelete(r.id)}>Verwijder</button>
                        </li>
                    ))
                }
            </ul>
        </div>
    );
}
