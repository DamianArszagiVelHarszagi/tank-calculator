import { useState, useRef, useEffect } from 'react';
import MapView from './components/MapView';
import Toast from './components/Toast';
import LeftPanel from './components/LeftPanel';
import Sidebar from './components/Sidebar';
import SavedRoutes from './components/SavedRoutes';
import { getLocationInfo, getPointAtDistanceKm } from './utils/geo';
import { loadPrices, getPricePerLiter } from './utils/prices';
import { planFuelStops, calcTotalFromPlan } from './utils/fuel';
import { loadSafetyData } from './utils/safety';
import { saveRouteToStorage } from './utils/storage';

export default function App() {
    const [page, setPage] = useState('calculator');

    const [stops, setStops] = useState([]);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [routeKey, setRouteKey] = useState(0);
    const [routeLegs, setRouteLegs] = useState([]);
    const [fuelPlan, setFuelPlan] = useState([]);
    const [tankEmptyPos, setTankEmptyPos] = useState(null);
    const [safetyAnalysis, setSafetyAnalysis] = useState(null);
    const [safetyLoading, setSafetyLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [toast, setToast] = useState(null);

    const [fuelType, setFuelType] = useState('95');
    const [consumption, setConsumption] = useState(7);
    const [tankCapacity, setTankCapacity] = useState(50);
    const [persons, setPersons] = useState(1);
    const [isReturn, setIsReturn] = useState(false);

    const geocodeSeqRef = useRef(0);
    const geocodeQueueRef = useRef(Promise.resolve());
    const fuelPricesRef = useRef(null);
    const fuelPlanRef = useRef([]);

    useEffect(() => {
        loadPrices()
            .then(p => { fuelPricesRef.current = p; })
            .catch(() => {
                fuelPricesRef.current = { DEFAULT: { '95': 1.65, '98': 1.78, 'diesel': 1.52 } };
            });
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    function showToast(msg) { setToast(msg); }

    function clearRoute() {
        setRouteGeometry(null);
        setRouteKey(k => k + 1);
        setRouteLegs([]);
        setFuelPlan([]);
        fuelPlanRef.current = [];
        setTankEmptyPos(null);
        setSafetyAnalysis(null);
        setResults(null);
    }

    function addStop(stop) {
        geocodeSeqRef.current++;
        clearRoute();
        setStops(prev => [...prev, { ...stop, id: `stop-${Date.now()}-${Math.random()}` }]);
    }

    function onMapClick({ lat, lng }) {
        if (results) {
            showToast('Klik op "Wis alles" om een nieuwe route te beginnen.');
            return;
        }
        const id = `stop-${Date.now()}`;
        setStops(prev => [...prev, { id, lat, lng, name: '...', countryCode: 'DEFAULT' }]);

        const seq = geocodeSeqRef.current;
        geocodeQueueRef.current = geocodeQueueRef.current.then(async () => {
            await new Promise(r => setTimeout(r, 350));
            if (geocodeSeqRef.current !== seq) return;
            const info = await getLocationInfo(lat, lng);
            if (geocodeSeqRef.current !== seq) return;
            setStops(prev => prev.map(s => s.id === id
                ? { ...s, name: info.name, countryCode: info.countryCode }
                : s
            ));
        });
    }

    function moveStop(index, direction) {
        const newIndex = index + direction;
        setStops(prev => {
            const arr = [...prev];
            [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
            return arr;
        });
        geocodeSeqRef.current++;
        clearRoute();
    }

    function removeStop(index) {
        setStops(prev => prev.filter((_, i) => i !== index));
        geocodeSeqRef.current++;
        clearRoute();
    }

    function clearAll(needsConfirm = true) {
        if (needsConfirm && stops.length && !window.confirm('Alle stops wissen?')) return;
        geocodeSeqRef.current++;
        setStops([]);
        clearRoute();
    }

    async function waitForPrices() {
        while (!fuelPricesRef.current) {
            await new Promise(r => setTimeout(r, 100));
        }
        return fuelPricesRef.current;
    }

    async function calculate({
        activeStops = stops,
        activeFuelType = fuelType,
        activeConsumption = consumption,
        activeTankCapacity = tankCapacity,
        activePersons = persons,
        activeIsReturn = isReturn,
    } = {}) {
        if (activeStops.length < 2) return;

        const prices = await waitForPrices();
        const seq = ++geocodeSeqRef.current;

        setIsCalculating(true);
        setRouteGeometry(null);
        setRouteKey(k => k + 1);
        setFuelPlan([]);
        fuelPlanRef.current = [];
        setTankEmptyPos(null);
        setSafetyAnalysis(null);
        setResults(null);

        const coordsString = activeStops.map(s => `${s.lng},${s.lat}`).join(';');
        const reverseCoords = activeIsReturn
            ? activeStops.slice().reverse().map(s => `${s.lng},${s.lat}`).join(';')
            : null;

        try {
            const [data, reverseData] = await Promise.all([
                fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`)
                    .then(r => r.json()),
                reverseCoords
                    ? fetch(`https://router.project-osrm.org/route/v1/driving/${reverseCoords}?overview=full&geometries=geojson`)
                        .then(r => r.json()).catch(() => null)
                    : Promise.resolve(null),
            ]);

            if (geocodeSeqRef.current !== seq) return;

            if (!data.routes?.length) {
                setResults({ error: 'Geen route gevonden.' });
                setIsCalculating(false);
                return;
            }

            const route = data.routes[0];
            setRouteGeometry(route.geometry);
            setRouteKey(k => k + 1);
            setRouteLegs(route.legs);

            // Outbound legs
            let totalKm = 0, totalLiters = 0, outboundCost = 0;
            let remainingFuel = activeTankCapacity;
            let tankEmptyInfo = null;
            const legs = [];

            for (let i = 0; i < route.legs.length; i++) {
                const km = route.legs[i].distance / 1000;
                const from = activeStops[i];
                const to = activeStops[i + 1];
                const crossBorder = from.countryCode !== to.countryCode;
                const avgPrice = (
                    getPricePerLiter(prices, from.countryCode, activeFuelType) +
                    getPricePerLiter(prices, to.countryCode, activeFuelType)
                ) / 2;
                const liters = (km / 100) * activeConsumption;
                const cost = liters * avgPrice;

                totalKm += km;
                totalLiters += liters;
                outboundCost += cost;

                if (tankEmptyInfo === null && remainingFuel < liters) {
                    const kmUntilEmpty = (remainingFuel / activeConsumption) * 100;
                    tankEmptyInfo = {
                        kmTotal: totalKm - km + kmUntilEmpty,
                        fromName: from.name,
                        toName: to.name,
                    };
                }
                remainingFuel = Math.max(0, remainingFuel - liters);

                legs.push({
                    fromName: from.name, toName: to.name,
                    fromCode: from.countryCode, toCode: to.countryCode,
                    km, price: avgPrice, liters, cost, crossBorder,
                });
            }

            // Return route
            let returnKm = 0, returnLiters = 0, returnCost = 0;
            if (activeIsReturn) {
                if (reverseData?.routes?.length) {
                    const reverseLegs = reverseData.routes[0].legs;
                    const reverseStops = activeStops.slice().reverse();
                    for (let i = 0; i < reverseLegs.length; i++) {
                        const km = reverseLegs[i].distance / 1000;
                        const from = reverseStops[i];
                        const to = reverseStops[i + 1];
                        const avgPrice = (
                            getPricePerLiter(prices, from.countryCode, activeFuelType) +
                            getPricePerLiter(prices, to.countryCode, activeFuelType)
                        ) / 2;
                        returnKm += km;
                        returnLiters += (km / 100) * activeConsumption;
                        returnCost += (km / 100) * activeConsumption * avgPrice;
                    }
                } else {
                    returnKm = totalKm;
                    returnLiters = totalLiters;
                    returnCost = outboundCost;
                }
            }

            // Tank empty marker
            if (tankEmptyInfo) {
                const pt = getPointAtDistanceKm(route.geometry, tankEmptyInfo.kmTotal);
                setTankEmptyPos({ lat: pt.lat, lng: pt.lng, ...tankEmptyInfo });
            }

            // Fuel plan
            const newFuelPlan = planFuelStops(
                route.geometry, activeStops, route.legs,
                activeTankCapacity, activeConsumption, activeFuelType, prices
            );
            fuelPlanRef.current = newFuelPlan;
            setFuelPlan([...newFuelPlan]);

            const displayKm = totalKm + returnKm;
            const displayLiters = totalLiters + returnLiters;

            setResults({
                outboundCost,
                returnCost,
                totalKm: displayKm,
                totalLiters: displayLiters,
                persons: activePersons,
                isReturn: activeIsReturn,
                tankOk: !tankEmptyInfo,
                remainingFuel: tankEmptyInfo ? 0 : remainingFuel,
                tankEmptyKm: tankEmptyInfo?.kmTotal,
                tankEmptyFrom: tankEmptyInfo?.fromName,
                tankEmptyTo: tankEmptyInfo?.toName,
                legs,
                savedData: {
                    stops: activeStops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng, countryCode: s.countryCode })),
                    fuelType: activeFuelType,
                    consumption: activeConsumption,
                    tankCapacity: activeTankCapacity,
                    persons: activePersons,
                    isReturn: activeIsReturn,
                    totalKm: Math.round(displayKm),
                    totalCost: outboundCost + returnCost,
                    totalLiters: parseFloat(displayLiters.toFixed(1)),
                },
            });

            setIsCalculating(false);

            geocodeVirtualStops(newFuelPlan, seq, {
                stops: activeStops,
                routeLegs: route.legs,
                fuelType: activeFuelType,
                consumption: activeConsumption,
                tankCapacity: activeTankCapacity,
                prices,
                returnCost,
                isReturn: activeIsReturn,
                persons: activePersons,
                displayKm,
                displayLiters,
            });

        } catch (err) {
            if (geocodeSeqRef.current === seq) {
                setResults({ error: `Fout: ${err.message}` });
                setIsCalculating(false);
            }
        }
    }

    async function geocodeVirtualStops(plan, seq, ctx) {
        for (let i = 0; i < plan.length; i++) {
            const stop = plan[i];
            if (stop.type !== 'virtual') continue;
            if (geocodeSeqRef.current !== seq) return;

            await new Promise(r => setTimeout(r, 1100));
            if (geocodeSeqRef.current !== seq) return;

            const info = await getLocationInfo(stop.lat, stop.lng);
            if (geocodeSeqRef.current !== seq) return;

            if (info.countryCode !== 'DEFAULT' && info.countryCode !== 'XX') {
                stop.countryCode = info.countryCode;
                stop.price = getPricePerLiter(ctx.prices, info.countryCode, ctx.fuelType);
                stop.name = info.display || info.name;
                stop.fillUpCost = ctx.tankCapacity * stop.price;
                stop.geocoded = true;
            }

            fuelPlanRef.current = [...plan];
            setFuelPlan([...plan]);
        }

        if (geocodeSeqRef.current !== seq) return;

        const newOutboundCost = calcTotalFromPlan(
            plan, ctx.stops, ctx.routeLegs, ctx.consumption, ctx.fuelType, ctx.prices
        );
        setResults(prev => prev && !prev.error ? { ...prev, outboundCost: newOutboundCost } : prev);
    }

    async function analyzeSafety() {
        if (!results || !routeLegs.length || !routeGeometry) return;
        setSafetyLoading(true);

        const data = await loadSafetyData();
        const seq = geocodeSeqRef.current;

        const stopKm = [0];
        let totalKm = 0;
        for (const leg of routeLegs) { totalKm += leg.distance / 1000; stopKm.push(totalKm); }

        const knownPoints = new Map();
        const calcStops = results.savedData.stops;
        for (let i = 0; i < calcStops.length; i++) {
            const s = calcStops[i];
            if (s.countryCode && s.countryCode !== 'DEFAULT' && s.countryCode !== 'XX')
                knownPoints.set(stopKm[i], { cc: s.countryCode, lat: s.lat, lng: s.lng });
        }
        for (const fp of fuelPlanRef.current) {
            if (fp.countryCode && fp.countryCode !== 'DEFAULT' && fp.countryCode !== 'XX')
                knownPoints.set(fp.km, { cc: fp.countryCode, lat: fp.lat, lng: fp.lng });
        }

        function buildAnalysis(scanning, done, total) {
            const sorted = [...knownPoints.entries()].sort((a, b) => a[0] - b[0]);
            const seen = new Set();
            const countries = [];
            for (const [, p] of sorted) {
                if (!seen.has(p.cc)) {
                    seen.add(p.cc);
                    countries.push({ cc: p.cc, lat: p.lat, lng: p.lng, info: data[p.cc] || null });
                }
            }
            setSafetyAnalysis({ countries, scanning, done, total });
        }

        const interval = 120;
        const totalSamples = Math.max(1, Math.ceil((totalKm - interval) / interval));
        let completedSamples = 0;

        buildAnalysis(true, 0, totalSamples);

        for (let km = interval; km < totalKm; km += interval) {
            if (geocodeSeqRef.current !== seq) { setSafetyLoading(false); return; }
            await new Promise(r => setTimeout(r, 1000));
            if (geocodeSeqRef.current !== seq) { setSafetyLoading(false); return; }

            const point = getPointAtDistanceKm(routeGeometry, km);
            const info = await getLocationInfo(point.lat, point.lng);
            const cc = info.countryCode;
            completedSamples++;

            if (cc && cc !== 'DEFAULT' && cc !== 'XX') {
                knownPoints.set(km, { cc, lat: point.lat, lng: point.lng });
            }
            buildAnalysis(km + interval < totalKm, completedSamples, totalSamples);
        }

        if (geocodeSeqRef.current === seq) buildAnalysis(false, completedSamples, totalSamples);
        setSafetyLoading(false);
    }

    function saveRoute() {
        if (!results?.savedData) return;
        const ok = saveRouteToStorage(results.savedData);
        showToast(ok ? 'Route opgeslagen!' : 'Opslag vol. Verwijder eerst een paar routes.');
    }

    function loadRoute(route) {
        setPage('calculator');
        geocodeSeqRef.current++;
        setStops([]);
        clearRoute();

        const newStops = route.stops.map((s, i) => ({ ...s, id: `loaded-${i}-${Date.now()}` }));
        setStops(newStops);
        setFuelType(route.fuelType);
        setConsumption(route.consumption);
        setTankCapacity(route.tankCapacity);
        setPersons(route.persons ?? 1);
        setIsReturn(route.isReturn ?? false);

        calculate({
            activeStops: newStops,
            activeFuelType: route.fuelType,
            activeConsumption: route.consumption,
            activeTankCapacity: route.tankCapacity,
            activePersons: route.persons ?? 1,
            activeIsReturn: route.isReturn ?? false,
        });
    }

    const hasResult = !!results && !results.error;

    return (
        <div id="layout">
            <MapView
                stops={stops}
                routeGeometry={routeGeometry}
                routeKey={routeKey}
                fuelPlan={fuelPlan}
                tankEmptyPos={tankEmptyPos}
                safetyAnalysis={safetyAnalysis}
                onMapClick={onMapClick}
            />
            <LeftPanel
                fuelPlan={fuelPlan}
                safetyAnalysis={safetyAnalysis}
                hasResult={hasResult}
                safetyLoading={safetyLoading}
                onSafety={analyzeSafety}
                onNavigateSaved={() => setPage('saved')}
            />
            <Sidebar
                stops={stops}
                onAddStop={addStop}
                onMove={moveStop}
                onRemove={removeStop}
                onClear={clearAll}
                onCalculate={calculate}
                onSave={saveRoute}
                results={results}
                isCalculating={isCalculating}
                fuelType={fuelType} setFuelType={setFuelType}
                consumption={consumption} setConsumption={setConsumption}
                tankCapacity={tankCapacity} setTankCapacity={setTankCapacity}
                persons={persons} setPersons={setPersons}
                isReturn={isReturn} setIsReturn={setIsReturn}
            />
            {page === 'saved' && (
                <SavedRoutes
                    onClose={() => setPage('calculator')}
                    onLoad={loadRoute}
                />
            )}
            <Toast msg={toast} />
        </div>
    );
}
