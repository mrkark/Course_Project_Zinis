/**
 * Adware & beacon tracking script
 * Simulates commercial adware / browser helper telemetry
 */
const adware = 'bundle_v2';

function injectBanners() {
  navigator.sendBeacon('https://ad-tracker.adnetwork.biz/click?id=123', JSON.stringify({ adware }));
  localStorage.setItem('ad_profile', 'user_interest');
}
