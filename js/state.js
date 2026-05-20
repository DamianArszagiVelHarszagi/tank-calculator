let fuelPrices = null;
const pricesReady = fetch('data/prices.json')
    .then(r => r.json())
    .then(data => fuelPrices = data)
    .catch(() => {
        fuelPrices = { DEFAULT: { "95": 1.65, "98": 1.78, "diesel": 1.52 } };
    });

function getPricePerLiter(countryCode, fuelType) {
    const prices = fuelPrices[countryCode] || fuelPrices.DEFAULT;
    return prices[fuelType];
}

let stops = [];
let routeLayer = null;
let tankEmptyMarker = null;
let recommendedStopMarkers = [];
let safetyMarkers = [];
let geocodeQueue = Promise.resolve();
let lastResult = null;
let lastFuelPlan = [];
let lastRouteGeometry = null;
let lastRouteLegs = [];
let geocodeSeq = 0;
let safetyData = null;
