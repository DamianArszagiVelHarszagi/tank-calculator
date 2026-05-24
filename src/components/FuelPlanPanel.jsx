export default function FuelPlanPanel({ fuelPlan }) {
    if (!fuelPlan.length) return null;

    const pending = fuelPlan.filter(s => s.type === 'virtual' && !s.geocoded).length;
    const statusMsg = pending
        ? <><span className="spinner">⟳</span> Prijzen ophalen ({pending} resterend)...</>
        : 'Alle prijzen bijgewerkt';

    return (
        <div className="plan-box">
            <strong>Tankplan ({fuelPlan.length} stop{fuelPlan.length > 1 ? 's' : ''}):</strong>
            <span className="plan-status">{statusMsg}</span>
            <br />
            {fuelPlan.map((s, i) => (
                <p key={s.id} className="plan-item">
                    {i + 1}.{' '}
                    {s.type === 'virtual'
                        ? <><span className="stop-virtual">{s.name}</span>{!s.geocoded && <small className="stop-estimate"> (schatting)</small>}</>
                        : <strong>{s.name}</strong>
                    }{' '}· km {s.km.toFixed(0)}<br />
                    €{s.price.toFixed(3)}/L · volle tank: <strong>€{s.fillUpCost.toFixed(2)}</strong>
                </p>
            ))}
            <small className="plan-legend">● groen = jouw stop &nbsp; ● oranje = aanbevolen tussenstop</small>
        </div>
    );
}
