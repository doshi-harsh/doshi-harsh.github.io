/* Cookie consent: Google Analytics loads only after the visitor accepts. */
(function () {
  var GA_ID = 'G-BMX84QVXR8';
  var KEY = 'hd-consent-v1';

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadAnalytics() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function stopAnalytics() {
    window['ga-disable-' + GA_ID] = true;
    var host = location.hostname;
    document.cookie.split(';').forEach(function (c) {
      var name = c.trim().split('=')[0];
      if (name === '_ga' || name.indexOf('_ga_') === 0) {
        ['', '; domain=' + host, '; domain=.' + host].forEach(function (d) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
        });
      }
    });
  }

  var css = '' +
    '.cc{position:fixed;left:16px;right:16px;bottom:16px;max-width:460px;z-index:50;padding:16px;border-radius:8px;' +
    'background:#111821;color:#d9e2ee;border:1px solid #4fd1c5;box-shadow:0 12px 40px -12px rgba(0,0,0,.6);' +
    'font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.cc b{display:block;font:700 12px/1 ui-monospace,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase;color:#4fd1c5;margin-bottom:8px}' +
    '.cc p{margin:0 0 12px;color:#a9b6c8}.cc a{color:#4fd1c5}' +
    '.cc div{display:flex;gap:8px;flex-wrap:wrap}' +
    '.cc button{font:600 13px/1 ui-monospace,Consolas,monospace;padding:11px 16px;border-radius:6px;cursor:pointer;' +
    'background:#0b0f14;color:#d9e2ee;border:1px solid #4fd1c5}' +
    '.cc button:hover{background:#4fd1c5;color:#04201e}' +
    '.cc button:focus-visible{outline:2px solid #f0b429;outline-offset:3px}' +
    '.cc-link{background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer}' +
    '.cc-link:hover{color:var(--accent,#4fd1c5)}' +
    '@media (prefers-color-scheme:light){.cc{background:#fff;color:#17212e;border-color:#0b7a75}' +
    '.cc b,.cc a{color:#0b7a75}.cc p{color:#5a6b80}.cc button{background:#fff;color:#17212e;border-color:#0b7a75}' +
    '.cc button:hover{background:#0b7a75;color:#fff}}';

  function closeBanner() {
    var el = document.getElementById('cc-banner');
    if (el) el.remove();
  }

  function choose(value) {
    write(value);
    closeBanner();
    if (value === 'granted') loadAnalytics(); else stopAnalytics();
  }

  function showBanner() {
    if (document.getElementById('cc-banner')) return;
    var box = document.createElement('section');
    box.id = 'cc-banner';
    box.className = 'cc';
    box.setAttribute('aria-label', 'Cookie consent');
    box.innerHTML =
      '<b>Cookies</b>' +
      '<p>I use Google Analytics cookies to see which pages are useful. They are off unless you accept, ' +
      'and nothing is used for advertising. <a href="/privacy.html">Privacy details</a></p>' +
      '<div><button type="button" id="cc-yes">Accept</button><button type="button" id="cc-no">Decline</button></div>';
    document.body.appendChild(box);
    document.getElementById('cc-yes').addEventListener('click', function () { choose('granted'); });
    document.getElementById('cc-no').addEventListener('click', function () { choose('denied'); });
  }

  function init() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var opener = document.getElementById('cc-open');
    if (opener) opener.addEventListener('click', showBanner);

    // Respect the browser's Global Privacy Control signal: treat it as a decline.
    if (navigator.globalPrivacyControl === true && read() !== 'granted') {
      write('denied');
      return;
    }

    var saved = read();
    if (saved === 'granted') loadAnalytics();
    else if (saved !== 'denied') showBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
