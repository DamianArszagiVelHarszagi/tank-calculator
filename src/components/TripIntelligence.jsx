const COUNTRY_NAMES = {
    BE: 'België', NL: 'Nederland', DE: 'Duitsland', FR: 'Frankrijk',
    LU: 'Luxemburg', ES: 'Spanje', IT: 'Italië', AT: 'Oostenrijk',
    CH: 'Zwitserland', PL: 'Polen', CZ: 'Tsjechië', HU: 'Hongarije',
    PT: 'Portugal', GB: 'VK', DK: 'Denemarken', SE: 'Zweden',
    NO: 'Noorwegen', HR: 'Kroatië', SI: 'Slovenië', SK: 'Slowakije',
    RO: 'Roemenië', BG: 'Bulgarije', GR: 'Griekenland', RS: 'Servië',
};

function countryName(code) {
    return COUNTRY_NAMES[code] || code;
}

export default function TripIntelligence({ results, fuelPlan }) {
    if (!results || results.error) return null;

    const tips = [];

    if (results.isReturn) {
        tips.push(`Retour inbegrepen — ${results.totalKm.toFixed(0)} km totaal`);
    }

    if (results.persons > 1) {
        const perPerson = (results.outboundCost + results.returnCost) / results.persons;
        tips.push(`Kosten gedeeld door ${results.persons} personen: €${perPerson.toFixed(2)} per persoon`);
    }

    if (results.legs.length > 1) {
        const byCountry = {};
        for (const leg of results.legs) {
            if (!byCountry[leg.fromCode]) byCountry[leg.fromCode] = [];
            byCountry[leg.fromCode].push(leg.price);
        }
        const avgs = Object.entries(byCountry).map(([cc, prices]) => ({
            cc,
            avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        }));
        if (avgs.length > 1) {
            const cheapest = avgs.reduce((a, b) => a.avg <= b.avg ? a : b);
            const priciest = avgs.reduce((a, b) => a.avg >= b.avg ? a : b);
            if (cheapest.cc !== priciest.cc) {
                tips.push(`${countryName(cheapest.cc)} heeft de goedkoopste brandstof op de route`);
            }
        }
    }

    const virtualStops = fuelPlan.filter(s => s.type === 'virtual');
    if (virtualStops.length > 0) {
        tips.push(`${virtualStops.length} aanbevolen tussenstop${virtualStops.length > 1 ? 's' : ''} op de route`);
    }

    if (!results.tankOk) {
        tips.push(`Tank leeg zonder bijvullen na ${results.tankEmptyKm.toFixed(0)} km`);
    }

    if (tips.length === 0) return null;

    return (
        <div className="trip_intelligence">
            <p className="trip_intelligence_title">Trip Intelligence</p>
            {tips.map((tip, i) => (
                <div key={i} className="trip_tip">
                    <span className="trip_tip_dot" />
                    {tip}
                </div>
            ))}
        </div>
    );
}
