export default function ActionButtons({ stops, hasResult, isCalculating, safetyLoading, onCalculate, onSave, onClear }) {
    return (
        <div className="action-buttons">
            <button id="calc-btn" onClick={onCalculate} disabled={stops.length < 2 || isCalculating}>
                {isCalculating ? 'Berekenen...' : 'Bereken route'}
            </button>
            {hasResult && (
                <button id="save-btn" onClick={onSave}>
                    Opslaan
                </button>
            )}
            <button id="clear-btn" onClick={onClear}>
                Wis alles
            </button>
        </div>
    );
}
