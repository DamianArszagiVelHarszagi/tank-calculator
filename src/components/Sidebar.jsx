import StopSearch from './StopSearch';
import StopsList from './StopsList';
import TripSettings from './TripSettings';
import ActionButtons from './ActionButtons';
import Results from './Results';

export default function Sidebar({
    stops, onAddStop, onMove, onRemove, onClear, onCalculate, onSave,
    results, isCalculating,
    fuelType, setFuelType,
    consumption, setConsumption,
    tankCapacity, setTankCapacity,
    persons, setPersons,
    isReturn, setIsReturn,
}) {
    const hasResult = !!results && !results.error;

    return (
        <div id="sidebar">
            <h2>🚗 TankCalc</h2>
            <StopSearch onAddStop={onAddStop} />
            <StopsList stops={stops} onMove={onMove} onRemove={onRemove} />
            <TripSettings
                fuelType={fuelType} setFuelType={setFuelType}
                consumption={consumption} setConsumption={setConsumption}
                tankCapacity={tankCapacity} setTankCapacity={setTankCapacity}
                persons={persons} setPersons={setPersons}
                isReturn={isReturn} setIsReturn={setIsReturn}
            />
            <ActionButtons
                stops={stops}
                hasResult={hasResult}
                isCalculating={isCalculating}
                onCalculate={onCalculate}
                onSave={onSave}
                onClear={onClear}
            />
            <Results results={results} isCalculating={isCalculating} />
        </div>
    );
}
