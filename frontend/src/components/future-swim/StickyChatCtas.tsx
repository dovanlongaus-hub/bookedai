import { MessageCircle, Send, Waves } from 'lucide-react';

type StickyChatCtasProps = {
  onOpenAsk: () => void;
  whatsappHref: string;
  telegramHref: string;
};

export function StickyChatCtas({ onOpenAsk, whatsappHref, telegramHref }: StickyChatCtasProps) {
  return (
    <div className="fs-sticky-ctas" aria-label="Chat with Future Swim">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="fs-sticky-button fs-sticky-whatsapp"
        aria-label="Chat with Future Swim on WhatsApp"
      >
        <MessageCircle size={18} aria-hidden="true" />
        <span className="fs-sticky-label">WhatsApp</span>
      </a>
      <a
        href={telegramHref}
        target="_blank"
        rel="noreferrer"
        className="fs-sticky-button fs-sticky-telegram"
        aria-label="Chat with Future Swim on Telegram"
      >
        <Send size={18} aria-hidden="true" />
        <span className="fs-sticky-label">Telegram</span>
      </a>
      <button
        type="button"
        onClick={onOpenAsk}
        className="fs-sticky-button fs-sticky-ask"
        aria-label="Open Future Swim Ask"
      >
        <Waves size={18} aria-hidden="true" />
        <span className="fs-sticky-label">Future Swim Ask</span>
      </button>
    </div>
  );
}
