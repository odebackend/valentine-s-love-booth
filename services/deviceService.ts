
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
}

export function getDeviceData(): DeviceData {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    return {
        userAgent: navigator.userAgent,
        platform: (navigator as any).platform || 'unknown',
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cores: navigator.hardwareConcurrency || 0,
        memory: (navigator as any).deviceMemory,
        connection: conn ? `${conn.effectiveType} (${conn.downlink}Mbps)` : 'unknown'
    };
}
