
export interface LocationData {
    ip: string;
    city: string;
    region: string;
    country: string;
    org: string;
}

export async function getLocationData(): Promise<LocationData | null> {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) return null;
        const data = await response.json();
        return {
            ip: data.ip,
            city: data.city,
            region: data.region,
            country: data.country_name,
            org: data.org
        };
    } catch (err) {
        console.warn('Failed to fetch location data', err);
        return null;
    }
}
