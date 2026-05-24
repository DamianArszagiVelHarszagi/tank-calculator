export default function TripSettings({
    fuelType, setFuelType,
    consumption, setConsumption,
    tankCapacity, setTankCapacity,
    persons, setPersons,
    isReturn, setIsReturn,
}) {
    return (
        <div className="settings-grid">
            <label>
                Brandstof:
                <select value={fuelType} onChange={e => setFuelType(e.target.value)}>
                    <option value="95">Euro 95</option>
                    <option value="98">Euro 98</option>
                    <option value="diesel">Diesel</option>
                </select>
            </label>
            <label>
                Verbruik (L/100km):
                <input type="number" value={consumption} min="1" max="30" step="0.1"
                    onChange={e => setConsumption(parseFloat(e.target.value) || 7)} />
            </label>
            <label>
                Tank (L):
                <input type="number" value={tankCapacity} min="10" max="200" step="1"
                    onChange={e => setTankCapacity(parseFloat(e.target.value) || 50)} />
            </label>
            <label>
                Personen:
                <input type="number" value={persons} min="1" max="20" step="1"
                    onChange={e => setPersons(Math.max(1, parseInt(e.target.value) || 1))} />
            </label>
            <label className="checkbox-label">
                <input type="checkbox" checked={isReturn} onChange={e => setIsReturn(e.target.checked)} />
                {' '}Retourreis
            </label>
        </div>
    );
}
