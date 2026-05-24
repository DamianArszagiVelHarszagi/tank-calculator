import { RISK_LABEL, calcOverallRisk } from '../utils/safety';

export default function SafetyPanel({ safetyAnalysis }) {
    if (!safetyAnalysis) return null;
    const { countries, scanning, done, total } = safetyAnalysis;
    const overallRisk = calcOverallRisk(countries);

    return (
        <div id="safety-results">
            <div className="safety-panel">
                <strong>Veiligheidsanalyse</strong>
                {scanning && <> <span className="spinner">⟳</span> <small className="scan-counter">{done}/{total}</small></>}
                <br /><br />
                {countries.map((c, i) => c.info && (
                    <div key={`${c.cc}-${i}`}>
                        <p className="safety-country">
                            <strong>{RISK_LABEL[c.info.risk] || '🟡'} — {c.info.name || c.cc}</strong>
                            {c.info.border && <><br /><small><em>Grens:</em> {c.info.border}</small></>}
                            {c.info.danger && <><br /><small className="danger-text"><em>Gevaar:</em> {c.info.danger}</small></>}
                            {c.info.traffic && <><br /><small><em>Verkeer:</em> {c.info.traffic}</small></>}
                            {c.info.practical && <><br /><small><em>Praktisch:</em> {c.info.practical}</small></>}
                        </p>
                        <hr className="safety-divider" />
                    </div>
                ))}
                <p className="safety-verdict"><strong>Eindoordeel: {RISK_LABEL[overallRisk]}</strong></p>
            </div>
        </div>
    );
}
