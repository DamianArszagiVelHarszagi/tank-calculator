export default function StopsList({ stops, onMove, onRemove }) {
    if (!stops.length) {
        return <p className="stops_empty">Klik op de kaart of zoek een stad om een stop toe te voegen.</p>;
    }

    return (
        <ul className="stops_list">
            {stops.map((stop, i) => (
                <li key={stop.id} className="stop_item">
                    <span className="stop_num">{i + 1}</span>
                    <span className="stop_name">{stop.name}</span>
                    <span className="stop_actions">
                        <button className="stop_btn" onClick={() => onMove(i, -1)} disabled={i === 0}>↑</button>
                        <button className="stop_btn" onClick={() => onMove(i, 1)} disabled={i === stops.length - 1}>↓</button>
                        <button className="stop_btn stop_btn_remove" onClick={() => onRemove(i)}>×</button>
                    </span>
                </li>
            ))}
        </ul>
    );
}
