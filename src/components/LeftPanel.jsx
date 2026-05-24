import FuelPlanPanel from './FuelPlanPanel';
import SafetyPanel from './SafetyPanel';

export default function LeftPanel({ fuelPlan, safetyAnalysis, hasResult, safetyLoading, onSafety, onNavigateSaved }) {
    return (
        <div id="left-col">
            <div id="vertical-nav">
                <button onClick={onNavigateSaved}>Opgeslagen</button>
                {hasResult && (
                    <button id="safety-btn" onClick={onSafety} disabled={safetyLoading}>
                        {safetyLoading ? <><span className="spinner">⟳</span> Analyseren...</> : 'Veiligheid'}
                    </button>
                )}
            </div>
            <div id="left-panel">
                {fuelPlan.length > 0 && (
                    <div id="plan-overlay">
                        <FuelPlanPanel fuelPlan={fuelPlan} />
                    </div>
                )}
                {safetyAnalysis && <SafetyPanel safetyAnalysis={safetyAnalysis} />}
            </div>
        </div>
    );
}
