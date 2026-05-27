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
        <div className="saved_page">
            <div className="saved_header">
                <Link to="/" className="nav_btn">← Terug</Link>
                <h2 className="saved_title">Opgeslagen routes</h2>
            </div>
            <div className="saved_list">
                {!routes.length
                    ? <p className="saved_empty">Geen opgeslagen routes</p>
                    : routes.map(r => (
                        <div key={r.id} className="saved_card">
                            <div className="saved_card_route">
                                {r.stops[0].name} → {r.stops[r.stops.length - 1].name}
                            </div>
                            <div className="saved_card_meta">
                                {r.date} · {r.totalKm} km · €{r.totalCost.toFixed(2)} · {r.fuelType}
                            </div>
                            <div className="saved_card_stops">
                                {r.stops.map(s => s.name).join(' → ')}
                            </div>
                            <div className="saved_card_actions">
                                <button className="saved_btn_load" onClick={() => onLoad(r)}>Laad route</button>
                                <button className="saved_btn_delete" onClick={() => handleDelete(r.id)}>Verwijder</button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}
