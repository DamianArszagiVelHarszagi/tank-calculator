import { Link } from 'react-router-dom';
import FuelPlanPanel from './FuelPlanPanel';
import SafetyPanel from './SafetyPanel';

export default function LeftPanel({ fuelPlan, safetyAnalysis, hasResult, safetyLoading, onSafety }) {
    return (
        <div className="left_col">
            <div className="vertical_nav">
                <Link to="/saved" className="nav_btn">Opgeslagen</Link>
                {hasResult && (
                    <button className="nav_btn nav_btn_safety" onClick={onSafety} disabled={safetyLoading}>
                        {safetyLoading ? <><span className="spinner">⟳</span> Analyseren...</> : 'Veiligheid'}
                    </button>
                )}
            </div>
            <div className="left_overlays">
                {fuelPlan.length > 0 && <FuelPlanPanel fuelPlan={fuelPlan} />}
                {safetyAnalysis && <SafetyPanel safetyAnalysis={safetyAnalysis} />}
            </div>
        </div>
    );
}
