export async function loadPrices() {
    try {
        const r = await fetch('data/prices.json');
        return await r.json();
    } catch {
        return { DEFAULT: { '95': 1.65, '98': 1.78, diesel: 1.52 } };
    }
}

export function getPricePerLiter(prices, countryCode, fuelType) {
    const p = prices[countryCode] || prices.DEFAULT;
    return p[fuelType];
}
