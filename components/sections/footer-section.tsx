import { Logo } from "@/components/brand/logo";
import { FadeIn } from "@/components/ui/motion";

const footerLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export function FooterSection() {
  return (
    <footer className="border-t border-slate-200 bg-white pb-10 pt-8">
      <div className="container-brand">
        <FadeIn className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <Logo variant="dark" showTagline className="max-w-[13rem]" />
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Capture demand from search, website, calls, email, and follow-up — then convert it into bookings and revenue automatically.
            </p>
          </div>

          <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2 lg:text-right">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#3563f6]">Navigation</div>
              <div className="mt-3 flex flex-col gap-2">
                {footerLinks.map((link) => (
                  <a key={link.href} href={link.href} className="transition hover:text-slate-900">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#3563f6]">Contact</div>
              <div className="mt-3 flex flex-col gap-2">
                <a href="mailto:info@bookedai.au" className="transition hover:text-slate-900">
                  info@bookedai.au
                </a>
                <a href="#pricing" className="transition hover:text-slate-900">
                  Book a Demo
                </a>
                <span>BookedAI.au</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}
