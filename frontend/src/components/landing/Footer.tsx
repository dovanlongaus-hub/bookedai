import {
  privacyHref,
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
      <div className="rounded-[2.5rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-950">BookedAI.au</div>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              AI receptionist support for Australian service businesses that want
              faster replies, better qualification, and more booked work.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={onStartTrial}
              className="rounded-full bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Start Free Trial
            </button>
            <button
              type="button"
              onClick={onBookDemo}
              className="rounded-full border border-black/10 bg-white px-4 py-2 font-medium text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
            >
              Book a Demo
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>info@bookedai.au</div>
          <div className="flex flex-wrap gap-4">
            <a href={videoDemoHref} className="transition hover:text-slate-950">
              Video Demo
            </a>
            <a href={privacyHref} className="transition hover:text-slate-950">
              Privacy Policy
            </a>
            <a href={termsHref} className="transition hover:text-slate-950">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
