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
                    onChange={e => setConsumption(parseFloat(e.target.value) || 7)} />
            </div>
            <div className="settings_field">
                <label className="settings_field_label">Tankinhoud (L)</label>
                <input className="settings_input" type="number" value={tankCapacity} min="10" max="200" step="1"
                    onChange={e => setTankCapacity(parseFloat(e.target.value) || 50)} />
            </div>
            <div className="settings_field">
                <label className="settings_field_label">Personen</label>
                <input className="settings_input" type="number" value={persons} min="1" max="20" step="1"
                    onChange={e => setPersons(Math.max(1, parseInt(e.target.value) || 1))} />
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
