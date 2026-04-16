import {
  privacyHref,
  roadmapHref,
  termsHref,
  videoDemoHref,
} from './data';

type FooterProps = {
  onStartTrial: () => void;
  onBookDemo: () => void;
};

export function Footer({ onStartTrial, onBookDemo }: FooterProps) {
  return (
    <footer className="mx-auto w-full max-w-7xl px-6 pb-12 pt-4 lg:px-8">
      <div className="apple-card px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-[-0.03em] text-[#1d1d1f]">BookedAI.au</div>
            <p className="apple-body mt-2 max-w-2xl text-sm leading-7">
              AI receptionist support for Australian service businesses that want
              faster replies, better qualification, and more booked work.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={onStartTrial}
              className="apple-button px-4 py-2 font-semibold"
            >
              Start Free Trial
            </button>
            <button
              type="button"
              onClick={onBookDemo}
              className="apple-button-secondary px-4 py-2 font-medium"
            >
              Book a Demo
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-black/8 pt-6 text-sm text-black/60 md:flex-row md:items-center md:justify-between">
          <div>info@bookedai.au</div>
          <div className="flex flex-wrap gap-4">
            <a href={videoDemoHref} className="apple-light-link transition hover:underline">
              Video Demo
            </a>
            <a href={roadmapHref} className="apple-light-link transition hover:underline">
              Roadmap
            </a>
            <a href={privacyHref} className="apple-light-link transition hover:underline">
              Privacy Policy
            </a>
            <a href={termsHref} className="apple-light-link transition hover:underline">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
