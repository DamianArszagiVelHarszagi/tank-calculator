export default function StopsList({ stops, onMove, onRemove }) {
    if (!stops.length) {
        return <ul id="stops-list"><li><em>Nog geen stops</em></li></ul>;
    }

    return (
        <ul id="stops-list">
            {stops.map((stop, i) => (
                <li key={stop.id}>
                    <span className="stop-name">{i + 1}. {stop.name}</span>
                    <span className="stop-actions">
                        <button onClick={() => onMove(i, -1)} disabled={i === 0}>↑</button>
                        <button onClick={() => onMove(i, 1)} disabled={i === stops.length - 1}>↓</button>
                        <button onClick={() => onRemove(i)}>×</button>
                    </span>
                </li>
            ))}
        </ul>
    );
}
