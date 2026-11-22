// Single list of screen profiles for the layout suite (plan section 7). zoom: CSS viewport already halved/quartered.
const P = (name, width, height, extra = {}) => ({ name, width, height, dpr: 1, touch: width < 1024 || height < 500, ...extra });
export const PHONE_PORTRAIT = [P('p320x568', 320, 568), P('p360x640', 360, 640), P('p360x740', 360, 740), P('p375x667', 375, 667), P('p390x844', 390, 844), P('p412x915', 412, 915), P('p428x926', 428, 926)];
export const PHONE_LANDSCAPE = [P('l568x320', 568, 320), P('l667x375', 667, 375), P('l740x360', 740, 360), P('l844x390', 844, 390), P('l915x412', 915, 412)];
export const TABLET = [P('t768x1024', 768, 1024), P('t1024x768', 1024, 768), P('t820x1180', 820, 1180), P('t1180x820', 1180, 820)];
export const DESKTOP = [P('d1280x720', 1280, 720), P('d1366x768', 1366, 768), P('d1440x900', 1440, 900), P('d1920x1080', 1920, 1080)];
export const TV = [P('tv1920x1080', 1920, 1080), P('tv3840x2160', 3840, 2160)];
export const SHARED = [P('s600x400', 600, 400), P('s800x450', 800, 450), P('s480x270', 480, 270), P('s1024x400', 1024, 400), P('s400x800', 400, 800), P('s1280x300', 1280, 300), P('s300x700', 300, 700)];
// 200 percent zoom of 1280x720 and 640x360 = CSS viewport 640x360 and 320x180 at dpr 2; 400 percent of 320x568 is about 80 px wide, not testable: 320x568 at 200 percent = 160x284 is below any real browser minimum, so the 200 percent profiles stop at 320x180
export const ZOOM = [P('z200-1280', 640, 360, { dpr: 2 }), P('z200-640', 320, 180, { dpr: 2 })];
export const ALL = [...PHONE_PORTRAIT, ...PHONE_LANDSCAPE, ...TABLET, ...DESKTOP, ...TV, ...SHARED, ...ZOOM];
// the quick subset used by test.sh (the full list: LAYOUT_ALL=1)
export const QUICK = [P('p320x568', 320, 568), P('p360x740', 360, 740), P('l667x375', 667, 375), P('t768x1024', 768, 1024), P('d1280x720', 1280, 720), P('tv3840x2160', 3840, 2160), P('s600x400', 600, 400), P('s1024x400', 1024, 400), P('z200-1280', 640, 360, { dpr: 2 })];
