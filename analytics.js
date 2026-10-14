/* BASE website contact-click event adapter.
 * Does not load third-party trackers or transmit data by itself.
 * Once a BASE-owned GA4 web stream is created and gtag is installed,
 * contact clicks can be measured as "contact_click".
 * No email, phone numbers, messages, or personal information are collected here.
 */
(function () {
  'use strict';
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var link = target.closest('a[href*="lin.ee/z5T92Yn"]');
    if (!link) return;
    var intent = link.getAttribute('data-lead') || 'general';
    if (!/^(general|camera|pbx|security|scs)$/.test(intent)) intent = 'general';
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'contact_click', {
        contact_method: 'line',
        service_interest: intent,
        page_path: window.location.pathname
      });
    }
  }, { passive: true });
}());
