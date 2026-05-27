export default function Results({ results, isCalculating }) {
    if (isCalculating) return <div className="results_calculating">Route berekenen...</div>;
    if (!results) return null;
    if (results.error) return <div className="results_error">{results.error}</div>;

    const {
        outboundCost, returnCost, totalKm, totalLiters,
        persons, isReturn,
        tankOk, remainingFuel, tankEmptyKm, tankEmptyFrom, tankEmptyTo,
        legs,
    } = results;

    const displayCost = outboundCost + returnCost;

    return (
        <div className="results_section">
            <p className="sidebar_label">Resultaten</p>

            <div className="results_metrics">
                <div className="results_metric results_metric_highlight">
                    <p className="results_metric_value">€{displayCost.toFixed(2)}</p>
                    <p className="results_metric_label">Totaal</p>
                </div>
                <div className="results_metric">
                    <p className="results_metric_value">{totalKm.toFixed(0)} km</p>
                    <p className="results_metric_label">Afstand</p>
                </div>
                <div className="results_metric">
                    <p className="results_metric_value">{totalLiters.toFixed(1)} L</p>
                    <p className="results_metric_label">Brandstof</p>
                </div>
                {persons > 1 && (
                    <div className="results_metric">
                        <p className="results_metric_value">€{(displayCost / persons).toFixed(2)}</p>
                        <p className="results_metric_label">Per persoon</p>
                    </div>
                )}
                {isReturn && (
                    <div className="results_metric">
                        <p className="results_metric_value">€{outboundCost.toFixed(2)}</p>
                        <p className="results_metric_label">Heen</p>
                    </div>
                )}
                {isReturn && (
                    <div className="results_metric">
                        <p className="results_metric_value">€{returnCost.toFixed(2)}</p>
                        <p className="results_metric_label">Terug</p>
                    </div>
                )}
            </div>

            {tankOk
                ? <div className="results_tank_ok">Tank houdt het vol — {remainingFuel.toFixed(1)} L over bij aankomst</div>
                : <div className="results_tank_warning">Zonder bijvullen leeg na {tankEmptyKm.toFixed(0)} km ({tankEmptyFrom} → {tankEmptyTo})</div>
            }

            <div className="results_legs">
                {legs.map((leg, i) => (
                    <div key={i} className="leg_card">
                        <p className="leg_route">{leg.fromName} → {leg.toName}</p>
                        <p className="leg_meta">{leg.km.toFixed(0)} km · €{leg.price.toFixed(3)}/L · {leg.liters.toFixed(1)} L · €{leg.cost.toFixed(2)}</p>
                        {leg.crossBorder && (
                            <p className="leg_border_note">Grensoversteek {leg.fromCode} → {leg.toCode}</p>
                        )}
                    </div>
                ))}
            </div>

            <p className="results_disclaimer">Prijzen zijn schattingen (gem. 2026).</p>
        </div>
    );
}
