export async function loadSafetyData() {
    try {
        const r = await fetch('data/safety.json');
        return await r.json();
    } catch {
        return {};
    }
}

export const RISK_LABEL = {
    green: 'Veilig',
    yellow: 'Opletten',
    red: 'Gevaarlijk',
};

export const RISK_ORDER = { green: 0, yellow: 1, red: 2 };

export function calcOverallRisk(countries) {
    let overall = 'green';
    for (const c of countries) {
        if (c.info && RISK_ORDER[c.info.risk] > RISK_ORDER[overall]) overall = c.info.risk;
    }
    return overall;
}
