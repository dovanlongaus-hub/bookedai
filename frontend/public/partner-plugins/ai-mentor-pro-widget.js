(function () {
  var script =
    document.currentScript ||
    document.querySelector('script[data-bookedai-plugin="ai-mentor-pro"]');

  if (!script) {
    return;
  }

  var host = script.getAttribute('data-bookedai-host') || 'https://product.bookedai.au';
  var path = script.getAttribute('data-bookedai-path') || '/partner/ai-mentor-pro/embed';
  var tenantRef = script.getAttribute('data-tenant-ref') || 'ai-mentor-doer';
  var mode = script.getAttribute('data-mode') || 'modal';
  var inlineTargetSelector = script.getAttribute('data-target');
  var launcherLabel = script.getAttribute('data-launcher-label') || 'Open AI Mentor Pro';
  var prompt = script.getAttribute('data-prompt') || '';
  var accent = script.getAttribute('data-accent') || '#1459c7';

  function buildIframeUrl() {
    var url = new URL(host.replace(/\/$/, '') + path, window.location.href);
    url.searchParams.set('embed', '1');
    url.searchParams.set('tenant_ref', tenantRef);
    if (prompt) {
      url.searchParams.set('q', prompt);
    }
    return url.toString();
  }

  function injectStyles() {
    if (document.getElementById('bookedai-ai-mentor-pro-widget-styles')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'bookedai-ai-mentor-pro-widget-styles';
    style.textContent =
      '.bookedai-ai-mentor-pro-launcher{' +
      'position:fixed;right:24px;bottom:24px;z-index:9998;border:0;border-radius:999px;' +
      'padding:14px 20px;background:' + accent + ';color:#fff;font:600 14px/1.2 Arial,sans-serif;' +
      'box-shadow:0 18px 40px rgba(20,89,199,.28);cursor:pointer;}' +
      '.bookedai-ai-mentor-pro-overlay{' +
      'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.58);display:flex;' +
      'align-items:flex-end;justify-content:flex-end;padding:24px;}' +
      '.bookedai-ai-mentor-pro-frame{' +
      'width:min(420px,100%);height:min(780px,100%);border:0;border-radius:24px;' +
      'background:#fff;box-shadow:0 24px 60px rgba(15,23,42,.3);overflow:hidden;}' +
      '.bookedai-ai-mentor-pro-inline{' +
      'width:100%;min-height:760px;border:0;border-radius:24px;overflow:hidden;' +
      'box-shadow:0 22px 56px rgba(15,23,42,.14);background:#fff;}' +
      '.bookedai-ai-mentor-pro-close{' +
      'position:absolute;top:18px;right:18px;z-index:10000;border:0;border-radius:999px;' +
      'width:38px;height:38px;background:#fff;color:#0f172a;font:700 18px/1 Arial,sans-serif;cursor:pointer;' +
      'box-shadow:0 10px 28px rgba(15,23,42,.18);}' +
      '@media (max-width: 640px){' +
      '.bookedai-ai-mentor-pro-overlay{padding:0;align-items:stretch;justify-content:stretch;}' +
      '.bookedai-ai-mentor-pro-frame{width:100%;height:100%;border-radius:0;}' +
      '.bookedai-ai-mentor-pro-launcher{right:16px;bottom:16px;}' +
      '}';
    document.head.appendChild(style);
  }

  function mountInline(target) {
    var iframe = document.createElement('iframe');
    iframe.className = 'bookedai-ai-mentor-pro-inline';
    iframe.src = buildIframeUrl();
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'clipboard-write; microphone';
    target.appendChild(iframe);
  }

  function mountModal() {
    var launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'bookedai-ai-mentor-pro-launcher';
    launcher.textContent = launcherLabel;

    launcher.addEventListener('click', function () {
      var overlay = document.createElement('div');
      overlay.className = 'bookedai-ai-mentor-pro-overlay';

      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'bookedai-ai-mentor-pro-close';
      close.setAttribute('aria-label', 'Close AI Mentor Pro');
      close.textContent = '×';

      var iframe = document.createElement('iframe');
      iframe.className = 'bookedai-ai-mentor-pro-frame';
      iframe.src = buildIframeUrl();
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allow = 'clipboard-write; microphone';

      function teardown() {
        document.body.style.overflow = '';
        overlay.remove();
      }

      close.addEventListener('click', teardown);
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) {
          teardown();
        }
      });

      overlay.appendChild(close);
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
    });

    document.body.appendChild(launcher);
  }

  injectStyles();

  if (mode === 'inline') {
    var target = inlineTargetSelector ? document.querySelector(inlineTargetSelector) : script.parentElement;
    if (!target) {
      return;
    }
    mountInline(target);
    return;
  }

  mountModal();
})();
