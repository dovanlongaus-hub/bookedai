import { MessageCircle, Send, Waves } from 'lucide-react';

type FutureSwimHeaderProps = {
  onOpenAsk: () => void;
  whatsappHref: string;
  telegramHref: string;
};

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '#levels', label: 'Levels' },
  { href: '#centres', label: 'Centres' },
  { href: '#timetable', label: 'Timetable' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function FutureSwimHeader({ onOpenAsk, whatsappHref, telegramHref }: FutureSwimHeaderProps) {
  return (
    <header className="fs-header">
      <div className="fs-container fs-header-inner">
        <a href="#top" className="fs-brand" aria-label="Future Swim home">
          <span className="fs-brand-mark" aria-hidden="true">
            <Waves size={20} />
          </span>
          <span className="fs-brand-text">
            <span className="fs-brand-name">Future Swim</span>
            <span className="fs-brand-tag">Sydney swim school</span>
          </span>
        </a>

        <nav className="fs-nav-links" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="fs-nav-link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="fs-header-actions">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="fs-button-ghost hidden sm:inline-flex"
            aria-label="WhatsApp Future Swim"
          >
            <MessageCircle size={14} aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
          <a
            href={telegramHref}
            target="_blank"
            rel="noreferrer"
            className="fs-button-ghost hidden md:inline-flex"
            aria-label="Telegram Future Swim"
          >
            <Send size={14} aria-hidden="true" />
            <span>Telegram</span>
          </a>
          <button
            type="button"
            onClick={onOpenAsk}
            className="fs-button-coral"
            aria-label="Open Future Swim Ask"
          >
            <Waves size={14} aria-hidden="true" />
            <span>Future Swim Ask</span>
          </button>
        </div>
      </div>
    </header>
  );
}
