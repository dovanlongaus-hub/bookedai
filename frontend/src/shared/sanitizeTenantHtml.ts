const ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'li',
  'ol',
  'p',
  'strong',
  'ul',
]);

const BLOCKED_TAGS = new Set(['embed', 'iframe', 'math', 'noscript', 'object', 'script', 'style', 'svg']);

function isSafeHref(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith('http://')
    || normalized.startsWith('https://')
    || normalized.startsWith('mailto:')
    || normalized.startsWith('tel:')
    || normalized.startsWith('/')
    || normalized.startsWith('#')
  );
}

function sanitizeNode(document: Document, node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  if (BLOCKED_TAGS.has(tagName)) {
    return null;
  }

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = document.createDocumentFragment();
    Array.from(element.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(document, child);
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    });
    return fragment;
  }

  const clean = document.createElement(tagName);
  if (tagName === 'a') {
    const href = element.getAttribute('href')?.trim() || '';
    if (href && isSafeHref(href)) {
      clean.setAttribute('href', href);
    }

    const title = element.getAttribute('title')?.trim() || '';
    if (title) {
      clean.setAttribute('title', title);
    }

    const target = element.getAttribute('target')?.trim() || '';
    if (target === '_blank' || target === '_self') {
      clean.setAttribute('target', target);
    }

    clean.setAttribute('rel', 'noopener noreferrer');
  }

  Array.from(element.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(document, child);
    if (sanitizedChild) {
      clean.appendChild(sanitizedChild);
    }
  });

  return clean;
}

export function sanitizeTenantHtml(html: string) {
  if (typeof window === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  const wrapper = document.createElement('div');
  Array.from(document.body.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(document, child);
    if (sanitizedChild) {
      wrapper.appendChild(sanitizedChild);
    }
  });
  return wrapper.innerHTML;
}
