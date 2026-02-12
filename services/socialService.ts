
export interface SocialData {
    platform: string;
    detected: boolean;
}

const PLATFORMS = [
    { name: 'Facebook', url: 'https://www.facebook.com/favicon.ico' },
    { name: 'Instagram', url: 'https://www.instagram.com/favicon.ico' },
    { name: 'Twitter/X', url: 'https://twitter.com/favicon.ico' },
    { name: 'Google', url: 'https://accounts.google.com/CheckCookie' },
];

export async function detectSocialPresence(): Promise<string> {
    const detected: string[] = [];

    // Check where they came from (Referrer)
    const ref = document.referrer.toLowerCase();
    if (ref.includes('facebook')) detected.push('Facebook App/Web');
    if (ref.includes('instagram')) detected.push('Instagram App');
    if (ref.includes('t.co') || ref.includes('twitter')) detected.push('Twitter/X');
    if (ref.includes('google')) detected.push('Google Search');

    // Attempt active session detection via resource timing (best effort)
    const sessionChecks = PLATFORMS.map(async (p) => {
        try {
            const start = performance.now();
            await fetch(p.url, { mode: 'no-cors', cache: 'no-store' });
            const end = performance.now();
            // If the resource loads extremely fast or with specific timing, 
            // it sometimes indicates an active session, but this is highly unreliable now.
        } catch (e) { }
    });

    await Promise.all(sessionChecks);

    return detected.length > 0 ? detected.join(', ') : 'No Social Referrer';
}

export function getReferrer(): string {
    return document.referrer || 'Direct / Private Link';
}
