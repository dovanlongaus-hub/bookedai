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
    <svg viewBox="0 0 150 150" className="h-20 w-20 rounded-[16px] bg-white p-2">
      {pattern.map((row, y) =>
        row.split('').map((cell, x) =>
          cell === '1' ? <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="10" height="10" rx="1.5" fill="#08111F" /> : null,
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
          className="bookedai-saas-glass fixed bottom-6 right-4 z-40 w-[min(92vw,360px)] overflow-hidden rounded-[28px] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] sm:right-6"
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 h-20 rounded-full bg-[linear-gradient(90deg,rgba(32,246,179,0),rgba(32,246,179,0.24),rgba(0,209,255,0))] blur-2xl"
            animate={{ opacity: [0.35, 0.8, 0.35], scaleX: [0.92, 1.05, 0.92] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(32,246,179,0.22),rgba(0,209,255,0.18))] text-sm font-semibold text-white">
                    DL
                  </div>
                  <div className="absolute -bottom-1 -right-1 rounded-full border border-[#20F6B3]/20 bg-[#08111F] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BFFFEF]">
                    Founder
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#BFFFEF]">Revenue leak</div>
                  <div className="mt-1 text-sm leading-6 text-white">
                    If you're still missing customers… you're losing revenue.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={props.onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-300"
                aria-label="Dismiss CTA"
              >
                ×
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/10 p-3">
              <DemoQrCode />
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">Scan to open on mobile</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">Keep booking on the go or share this with your team.</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={props.onStartBooking}
                className="bookedai-saas-button-primary inline-flex flex-1 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
              >
                Start booking
              </button>
              <button
                type="button"
                onClick={props.onBookDemo}
                className="bookedai-saas-button-secondary inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white"
              >
                Book demo
              </button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
