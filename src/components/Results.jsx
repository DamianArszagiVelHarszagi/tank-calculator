export default function Results({ results, isCalculating }) {
    if (isCalculating) return <div id="results"><p>Route berekenen...</p></div>;
    if (!results) return null;

    if (results.error) return <div id="results"><p>{results.error}</p></div>;

    const {
        outboundCost, returnCost, totalKm, totalLiters,
        persons, isReturn,
        tankOk, remainingFuel, tankEmptyKm, tankEmptyFrom, tankEmptyTo,
        legs,
    } = results;

    const displayCost = outboundCost + returnCost;

    return (
        <div id="results">
            <p id="results-summary">
                <strong>TOTAAL: €{displayCost.toFixed(2)}</strong>
                {isReturn && <><br /><small>Heen: €{outboundCost.toFixed(2)} · Terug: €{returnCost.toFixed(2)}</small></>}
                {persons > 1 && <><br />Per persoon: <strong>€{(displayCost / persons).toFixed(2)}</strong></>}
                <br />{totalKm.toFixed(0)} km · {totalLiters.toFixed(1)} L
            </p>
            {tankOk
                ? <p className="tank-ok">Tank houdt het vol ({remainingFuel.toFixed(1)} L over bij aankomst)</p>
                : <p className="tank-warning">Zonder bijvullen leeg na ±{tankEmptyKm.toFixed(0)} km<br /><small>({tankEmptyFrom} → {tankEmptyTo})</small></p>
            }
            <hr />
            {legs.map((leg, i) => (
                <div key={i}>
                    <p className="leg-item">
                        <strong>{leg.fromName} → {leg.toName}</strong><br />
                        {leg.km.toFixed(0)} km · €{leg.price.toFixed(3)}/L · {leg.liters.toFixed(1)} L · <strong>€{leg.cost.toFixed(2)}</strong>
                        {leg.crossBorder && (
                            <><br /><span className="leg-cross-border">↳ grensoversteek {leg.fromCode} → {leg.toCode}</span></>
                        )}
                    </p>
                    <hr />
                </div>
            ))}
            <p><small>Prijzen zijn schattingen (gem. 2026).</small></p>
        </div>
    );
}
