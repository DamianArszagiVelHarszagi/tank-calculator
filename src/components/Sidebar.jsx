import StopSearch from './StopSearch';
import StopsList from './StopsList';
import TripSettings from './TripSettings';
import ActionButtons from './ActionButtons';
import Results from './Results';
import TripIntelligence from './TripIntelligence';

export default function Sidebar({
    stops, onAddStop, onMove, onRemove, onClear, onCalculate, onSave,
    results, isCalculating, fuelPlan,
    fuelType, setFuelType,
    consumption, setConsumption,
    tankCapacity, setTankCapacity,
    persons, setPersons,
    isReturn, setIsReturn,
}) {
    const hasResult = !!results && !results.error;

    return (
        <div className="sidebar">
            <div className="sidebar_brand">TankCalc</div>

            <div className="sidebar_section">
                <p className="sidebar_label">Route</p>
                <StopSearch onAddStop={onAddStop} />
                <StopsList stops={stops} onMove={onMove} onRemove={onRemove} />
            </div>

            <div className="sidebar_section">
                <p className="sidebar_label">Instellingen</p>
                <TripSettings
                    fuelType={fuelType} setFuelType={setFuelType}
                    consumption={consumption} setConsumption={setConsumption}
                    tankCapacity={tankCapacity} setTankCapacity={setTankCapacity}
                    persons={persons} setPersons={setPersons}
                    isReturn={isReturn} setIsReturn={setIsReturn}
                />
            </div>

            <div className="sidebar_section">
                <ActionButtons
                    stops={stops}
                    hasResult={hasResult}
                    isCalculating={isCalculating}
                    onCalculate={onCalculate}
                    onSave={onSave}
                    onClear={onClear}
                />
            </div>

            <Results results={results} isCalculating={isCalculating} />

            {results && !results.error && (
                <div className="sidebar_section">
                    <TripIntelligence results={results} fuelPlan={fuelPlan} />
                </div>
            )}
        </div>
    );
}
