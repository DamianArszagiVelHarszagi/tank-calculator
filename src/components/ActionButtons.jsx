export default function ActionButtons({ stops, hasResult, isCalculating, onCalculate, onSave, onClear }) {
    return (
        <div>
            <button className="calc_btn" onClick={onCalculate} disabled={stops.length < 2 || isCalculating}>
                {isCalculating ? 'Berekenen...' : 'Bereken route'}
            </button>
            <div className="action_row">
                {hasResult && (
                    <button className="save_btn" onClick={onSave}>Opslaan</button>
                )}
                <button className="clear_btn" onClick={onClear}>Wis alles</button>
            </div>
        </div>
    );
}
