function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPointAtDistanceKm(geometry, targetKm) {
    const coords = geometry.coordinates;
    let accumulated = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        const [lng1, lat1] = coords[i];
        const [lng2, lat2] = coords[i + 1];
        const d = haversineKm(lat1, lng1, lat2, lng2);
        if (accumulated + d >= targetKm) {
            const t = (targetKm - accumulated) / d;
            return { lat: lat1 + t * (lat2 - lat1), lng: lng1 + t * (lng2 - lng1) };
        }
        accumulated += d;
    }
    const last = coords[coords.length - 1];
    return { lat: last[1], lng: last[0] };
}

async function getLocationInfo(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=nl`
        );
        const data = await response.json();
        const countryCode = (data.address?.country_code || "XX").toUpperCase();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
        const country = data.address?.country || "Onbekend";
        return {
            countryCode,
            name: city || country,
            display: city ? `${city}, ${country}` : country,
        };
    } catch {
        return {
            countryCode: "DEFAULT",
            name: `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
            display: "",
        };
    }
}
