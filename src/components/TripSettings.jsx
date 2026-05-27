export default function TripSettings({
    fuelType, setFuelType,
    consumption, setConsumption,
    tankCapacity, setTankCapacity,
    persons, setPersons,
    isReturn, setIsReturn,
}) {
    return (
        <div className="settings_grid">
            <div className="settings_field settings_field_full">
                <label className="settings_field_label">Brandstof</label>
                <select className="settings_select" value={fuelType} onChange={e => setFuelType(e.target.value)}>
                    <option value="95">Euro 95</option>
                    <option value="98">Euro 98</option>
                    <option value="diesel">Diesel</option>
                </select>
            </div>
            <div className="settings_field">
                <label className="settings_field_label">Verbruik (L/100km)</label>
                <input className="settings_input" type="number" value={consumption} min="1" max="30" step="0.1"
                    onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setConsumption(v); }}
                    onBlur={e => { const v = parseFloat(e.target.value); setConsumption(!isNaN(v) && v >= 1 ? v : 7); }} />
            </div>
            <div className="settings_field">
                <label className="settings_field_label">Tankinhoud (L)</label>
                <input className="settings_input" type="number" value={tankCapacity} min="10" max="200" step="1"
                    onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setTankCapacity(v); }}
                    onBlur={e => { const v = parseFloat(e.target.value); setTankCapacity(!isNaN(v) && v >= 10 ? v : 50); }} />
            </div>
            <div className="settings_field">
                <label className="settings_field_label">Personen</label>
                <input className="settings_input" type="number" value={persons} min="1" max="20" step="1"
                    onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setPersons(Math.max(1, v)); }}
                    onBlur={e => { const v = parseInt(e.target.value); setPersons(!isNaN(v) && v >= 1 ? v : 1); }} />
            </div>
            <div className="settings_field">
                <label className="settings_toggle">
                    <input type="checkbox" checked={isReturn} onChange={e => setIsReturn(e.target.checked)} />
                    <span className="settings_toggle_text">Retourreis</span>
                </label>
            </div>
        </div>
    );
}
