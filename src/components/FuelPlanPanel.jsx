export default function FuelPlanPanel({ fuelPlan }) {
    if (!fuelPlan.length) return null;

    const pending = fuelPlan.filter(s => s.type === 'virtual' && !s.geocoded).length;

    return (
        <div className="fuel_overlay">
            <div className="fuel_overlay_header">
                <span className="fuel_overlay_title">Tankplan ({fuelPlan.length} stop{fuelPlan.length > 1 ? 's' : ''})</span>
                <span className="fuel_overlay_status">
                    {pending
                        ? <><span className="spinner">⟳</span> {pending} resterend</>
                        : 'Bijgewerkt'
                    }
                </span>
            </div>

            <div className="fuel_cards">
                {fuelPlan.map((s, i) => (
                    <div key={s.id} className="fuel_card">
                        <span className={`fuel_card_num ${s.type === 'virtual' ? 'fuel_card_num_virtual' : ''}`}>
                            {i + 1}
                        </span>
                        <div className="fuel_card_body">
                            <div className={`fuel_card_name ${s.type === 'virtual' && !s.geocoded ? 'fuel_card_name_estimate' : ''}`}>
                                {s.name}
                                {s.type === 'virtual' && !s.geocoded && ' (schatting)'}
                            </div>
                            <div className="fuel_card_km">km {s.km.toFixed(0)}</div>
                        </div>
                        <div>
                            <div className="fuel_card_price">€{s.price.toFixed(3)}/L</div>
                            <div className="fuel_card_cost">€{s.fillUpCost.toFixed(2)}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fuel_legend">
                <span className="fuel_legend_item">
                    <span className="fuel_legend_dot" style={{background: '#27ae60'}} />
                    Jouw stop
                </span>
                <span className="fuel_legend_item">
                    <span className="fuel_legend_dot" style={{background: '#e67e22'}} />
                    Aanbevolen
                </span>
            </div>
        </div>
    );
}
