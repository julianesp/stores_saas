import { parseUserAgent } from '../../cloudflare-migration/src/utils/user-agent';

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipadAsMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  facebookApp:
    'Mozilla/5.0 (Linux; Android 14; moto g54) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  headless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/130.0.0.0 Safari/537.36',
};

describe('parseUserAgent (panel de visitas)', () => {
  it('Android con Chrome es celular', () => {
    expect(parseUserAgent(UA.androidChrome)).toEqual({
      isBot: false,
      deviceType: 'mobile',
      os: 'Android',
      browser: 'Chrome',
    });
  });

  it('Android sin "Mobile" es tablet', () => {
    expect(parseUserAgent(UA.androidTablet).deviceType).toBe('tablet');
  });

  it('iPhone con Safari', () => {
    expect(parseUserAgent(UA.iphoneSafari)).toMatchObject({ os: 'iOS', deviceType: 'mobile', browser: 'Safari' });
  });

  it('un iPad que se presenta como Mac se detecta por la pantalla táctil', () => {
    expect(parseUserAgent(UA.ipadAsMac).os).toBe('macOS');
    expect(parseUserAgent(UA.ipadAsMac, true)).toMatchObject({ os: 'iOS', deviceType: 'tablet' });
  });

  it('Edge no se confunde con Chrome', () => {
    expect(parseUserAgent(UA.windowsEdge)).toMatchObject({ os: 'Windows', browser: 'Edge' });
  });

  it('reconoce el navegador interno de Facebook', () => {
    expect(parseUserAgent(UA.facebookApp).browser).toBe('Facebook (app)');
  });

  it.each([UA.googlebot, UA.headless, 'curl/8.5.0', ''])('descarta bots: %j', (ua) => {
    expect(parseUserAgent(ua).isBot).toBe(true);
  });
});
