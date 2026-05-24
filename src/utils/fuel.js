import { getPointAtDistanceKm } from './geo';
import { getPricePerLiter } from './prices';

export function planFuelStops(geometry, stops, routeLegs, tankCapacity, consumption, fuelType, prices) {
    const range = (tankCapacity / consumption) * 100;

    const stopKm = [0];
    let cum = 0;
    for (const leg of routeLegs) {
        cum += leg.distance / 1000;
        stopKm.push(cum);
    }
    const totalKm = cum;

    const plan = [];
    let lastFillKm = 0;
    let iterations = 0;

    while (lastFillKm + range < totalKm && iterations++ < 50) {
        const candidates = [];
        for (let i = 1; i < stops.length - 1; i++) {
            if (stopKm[i] > lastFillKm && stopKm[i] <= lastFillKm + range) {
                candidates.push({
                    type: 'waypoint',
                    id: `wp-${i}`,
                    km: stopKm[i],
                    countryCode: stops[i].countryCode,
                    price: getPricePerLiter(prices, stops[i].countryCode, fuelType),
                    name: stops[i].name,
                    lat: stops[i].lat,
                    lng: stops[i].lng,
                });
            }
        }

        if (candidates.length > 0) {
            const best = candidates.reduce((a, b) => a.price <= b.price ? a : b);
            plan.push({ ...best, fillUpCost: tankCapacity * best.price });
            lastFillKm = best.km;
        } else {
            const fillKm = lastFillKm + range * 0.8;
            const point = getPointAtDistanceKm(geometry, fillKm);

            let legIdx = routeLegs.length - 1;
            for (let i = 0; i < stopKm.length - 1; i++) {
                if (fillKm >= stopKm[i] && fillKm <= stopKm[i + 1]) { legIdx = i; break; }
            }
            const price = (
                getPricePerLiter(prices, stops[legIdx].countryCode, fuelType) +
                getPricePerLiter(prices, stops[legIdx + 1].countryCode, fuelType)
            ) / 2;

            plan.push({
                type: 'virtual',
                id: `virt-${Math.round(fillKm)}`,
                km: fillKm,
                price,
                name: `~km ${Math.round(fillKm)}`,
                legFrom: stops[legIdx].name,
                legTo: stops[legIdx + 1].name,
                lat: point.lat,
                lng: point.lng,
                fillUpCost: tankCapacity * price,
                geocoded: false,
            });
            lastFillKm = fillKm;
        }
    }

    return plan;
}

export function calcTotalFromPlan(fuelPlan, routeStops, routeLegs, consumption, fuelType, prices) {
    const totalKm = routeLegs.reduce((s, l) => s + l.distance / 1000, 0);
    const checkpoints = [{ km: 0, price: getPricePerLiter(prices, routeStops[0].countryCode, fuelType) }];
    for (const stop of fuelPlan) checkpoints.push({ km: stop.km, price: stop.price });
    let cost = 0;
    for (let i = 0; i < checkpoints.length; i++) {
        const endKm = i + 1 < checkpoints.length ? checkpoints[i + 1].km : totalKm;
        cost += (endKm - checkpoints[i].km) * consumption / 100 * checkpoints[i].price;
    }
    return cost;
}
