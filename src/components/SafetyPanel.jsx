import { calcOverallRisk } from '../utils/safety';

const RISK_LABEL = { green: 'Veilig', yellow: 'Opletten', red: 'Gevaarlijk' };
const BADGE_CLASS = { green: 'safety_badge_green', yellow: 'safety_badge_yellow', red: 'safety_badge_red' };

export default function SafetyPanel({ safetyAnalysis }) {
    if (!safetyAnalysis) return null;
    const { countries, scanning, done, total } = safetyAnalysis;
    const overallRisk = calcOverallRisk(countries);

    return (
        <div className="safety_overlay">
            <div className="safety_overlay_header">
                <span className="safety_overlay_title">Veiligheidsanalyse</span>
                {scanning && (
                    <span className="safety_scan_status">
                        <span className="spinner">⟳</span>
                        <span className="scan_counter">{done}/{total}</span>
                    </span>
                )}
            </div>

            <div className="safety_countries">
                {countries.map((c, i) => c.info && (
                    <div key={`${c.cc}-${i}`} className="safety_country_card">
                        <div className="safety_country_header">
                            <span className="safety_country_name">{c.info.name || c.cc}</span>
                            <span className={`safety_badge ${BADGE_CLASS[c.info.risk] || 'safety_badge_yellow'}`}>
                                {RISK_LABEL[c.info.risk] || 'Opletten'}
                            </span>
                        </div>
                        {c.info.border && <p className="safety_country_detail">{c.info.border}</p>}
                        {c.info.traffic && <p className="safety_country_detail">{c.info.traffic}</p>}
                        {c.info.practical && <p className="safety_country_detail">{c.info.practical}</p>}
                        {c.info.danger && <p className="safety_country_danger">{c.info.danger}</p>}
                    </div>
                ))}
            </div>

            <div className="safety_verdict">
                Eindoordeel: {RISK_LABEL[overallRisk]}
            </div>
        </div>
    );
}
