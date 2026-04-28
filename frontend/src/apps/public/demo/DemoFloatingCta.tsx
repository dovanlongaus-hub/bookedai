import { motion, AnimatePresence } from 'framer-motion';

function DemoQrCode() {
  const pattern = [
    '111111001011111',
    '100001101010001',
    '101101001011101',
    '101101111011101',
    '101101001011101',
    '100001101010001',
    '111111001011111',
    '000000000000000',
    '110011101110011',
    '001100010001100',
    '111010111010111',
    '001100010001100',
    '110011101110011',
    '000000000000000',
    '111111001011111',
  ];

  return (
    <svg viewBox="0 0 150 150" className="h-20 w-20 rounded-[16px] bg-white p-2" aria-hidden="true">
      {pattern.map((row, y) =>
        row.split('').map((cell, x) =>
          cell === '1' ? <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="10" height="10" rx="1.5" fill="#1d1d1f" /> : null,
        ),
      )}
    </svg>
  );
}

export function DemoFloatingCta(props: {
  open: boolean;
  onClose: () => void;
  onStartBooking: () => void;
  onBookDemo: () => void;
}) {
  return (
    <AnimatePresence>
      {props.open ? (
        <motion.aside
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-4 z-40 w-[min(92vw,360px)] overflow-hidden rounded-[28px] border border-white/10 bg-apple-dark-2 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.4)] sm:right-6"
          aria-labelledby="demo-floating-cta-title"
        >
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-apple-blue/15 text-sm font-semibold text-white">
                    DL
                  </div>
                  <div className="absolute -bottom-1 -right-1 rounded-full border border-apple-blue/30 bg-black px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                    Founder
                  </div>
                </div>
                <div>
                  <div id="demo-floating-cta-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-apple-blue">Revenue leak</div>
                  <p className="mt-1 text-sm leading-6 text-white">
                    Every missed customer is missed revenue. Take the next 60 seconds.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={props.onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/75 motion-safe:transition-all duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60"
                aria-label="Dismiss revenue prompt"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/30 p-3">
              <DemoQrCode />
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">Scan to open on mobile</div>
                <div className="mt-1 text-xs leading-5 text-white/60">Keep booking on the go or share with your team.</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={props.onStartBooking}
                className="inline-flex flex-1 min-h-[44px] items-center justify-center rounded-full bg-apple-blue px-4 py-3 text-sm font-semibold text-white shadow-[0_9px_22px_rgba(0,113,227,0.18)] motion-safe:transition-all duration-200 hover:bg-apple-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-apple-dark-2"
              >
                Run the live demo
              </button>
              <button
                type="button"
                onClick={props.onBookDemo}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white motion-safe:transition-all duration-200 hover:border-white/30 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60"
              >
                Talk to a founder
              </button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
