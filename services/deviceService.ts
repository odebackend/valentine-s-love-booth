
export interface DeviceData {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    viewportSize: string;
    timezone: string;
    cores: number;
    memory?: number;
    connection?: string;
    battery?: string;
    tabsOpen: number;
    cookiesEnabled: boolean;
    doNotTrack: string | null;
}

// Track tab count via BroadcastChannel (only for same-origin)
let tabCount = 1;
try {
    const channel = new BroadcastChannel('love_booth_sync');
    channel.onmessage = (e) => {
        if (e.data === 'ping') {
            channel.postMessage('pong');
            tabCount++;
        } else if (e.data === 'pong') {
            tabCount++;
        }
    };
    channel.postMessage('ping');
} catch (err) {
    console.warn('BroadcastChannel not supported');
}

export async function getDetailedDeviceData(): Promise<DeviceData> {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    let batteryLevel = 'unknown';
    try {
        if ('getBattery' in navigator) {
            const b: any = await (navigator as any).getBattery();
            batteryLevel = `${Math.round(b.level * 100)}% (${b.charging ? 'Charging' : 'Discharging'})`;
        }
    } catch (e) { }

    return {
        userAgent: navigator.userAgent,
        platform: (navigator as any).platform || 'unknown',
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cores: navigator.hardwareConcurrency || 0,
        memory: (navigator as any).deviceMemory,
        connection: conn ? `${conn.effectiveType} (${conn.downlink}Mbps)` : 'unknown',
        battery: batteryLevel,
        tabsOpen: tabCount,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack
    };
}
