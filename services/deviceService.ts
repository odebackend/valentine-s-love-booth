
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
    gpu?: string;
    touchPoints: number;
    pixelRatio: number;
    colorDepth: number;
    adBlocker?: boolean;
}

// Track tab count via BroadcastChannel
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
} catch (err) { }

export async function getDetailedDeviceData(): Promise<DeviceData> {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    // GPU Detection
    let gpu = 'unknown';
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                gpu = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch (e) { }

    // Battery Detection
    let batteryLevel = 'unknown';
    try {
        if ('getBattery' in navigator) {
            const b: any = await (navigator as any).getBattery();
            batteryLevel = `${Math.round(b.level * 100)}% (${b.charging ? 'Charging' : 'Discharging'})`;
        }
    } catch (e) { }

    // AdBlocker Detection (Mock check by checking if a common ad script would be blocked)
    let adBlocker = false;
    try {
        const url = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' }).catch(() => null);
        if (!response) adBlocker = true;
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
        doNotTrack: navigator.doNotTrack,
        gpu,
        touchPoints: navigator.maxTouchPoints || 0,
        pixelRatio: window.devicePixelRatio,
        colorDepth: window.screen.colorDepth,
        adBlocker
    };
}
