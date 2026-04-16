import { bookingAssistantContent } from '../../components/landing/data';
import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';

export function ProductApp() {
  return (
    <main className="apple-public-shell h-[100dvh] overflow-hidden">
      <BookingAssistantDialog
        content={bookingAssistantContent}
        isOpen
        standalone
        layoutMode="product_app"
        closeLabel="BookedAI.au"
        onClose={() => {
          window.location.href = 'https://bookedai.au/';
        }}
      />
    </main>
  );
}
