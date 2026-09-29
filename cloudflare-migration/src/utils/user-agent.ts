export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ParsedUserAgent {
  isBot: boolean;
  deviceType: DeviceType;
  os: string;
  browser: string;
}

// Googlebot y los navegadores headless sí ejecutan JS, así que también hay que filtrarlos.
const BOT_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|scrapy|httpclient|phantom|selenium|puppeteer|playwright|wappalyzer|semrush|ahrefs|facebookexternalhit/i;

// `touch` corrige iPadOS 13+, que en Safari se identifica como Mac.
export function parseUserAgent(ua: string, touch = false): ParsedUserAgent {
  if (!ua || BOT_RE.test(ua)) {
    return { isBot: true, deviceType: 'desktop', os: 'Otro', browser: 'Otro' };
  }

  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch);
  const isIPhone = /iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  let os = 'Otro';
  if (isIPad || isIPhone) os = 'iOS';
  else if (isAndroid) os = 'Android';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux|X11/.test(ua)) os = 'Linux';

  let deviceType: DeviceType = 'desktop';
  if (isIPad) deviceType = 'tablet';
  else if (isIPhone) deviceType = 'mobile';
  else if (isAndroid) deviceType = /Mobile/.test(ua) ? 'mobile' : 'tablet';
  else if (/IEMobile|Opera Mini|BlackBerry|Mobile/.test(ua)) deviceType = 'mobile';

  // El orden importa: casi todos incluyen "Chrome/" o "Safari/" en su UA.
  let browser = 'Otro';
  if (/FBAN|FBAV|FB_IAB/.test(ua)) browser = 'Facebook (app)';
  else if (/Instagram/.test(ua)) browser = 'Instagram (app)';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/Edg(e|A|iOS)?\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Firefox\/|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Chrome\/|CriOS/.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  return { isBot: false, deviceType, os, browser };
}
