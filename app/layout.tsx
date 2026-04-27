import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bookedai.au | The AI Revenue Engine for Service Businesses",
  description:
    "Bookedai.au captures demand across search, website, calls, email, and follow-up, then converts it into confirmed bookings and revenue automatically.",
  metadataBase: new URL("https://bookedai.au"),
  icons: {
    icon: [
      { url: "/branding/bookedai-icon-32.png?v=20260418-brand-system", sizes: "32x32", type: "image/png" },
      { url: "/branding/bookedai-mobile-icon-192.png?v=20260418-brand-system", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/branding/bookedai-apple-touch-icon.png?v=20260418-brand-system", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/branding/bookedai-icon-32.png?v=20260418-brand-system"],
  },
  openGraph: {
    title: "Bookedai.au | The AI Revenue Engine for Service Businesses",
    description:
      "Turn search, calls, emails, and enquiries into revenue with one revenue engine for service businesses.",
    url: "https://bookedai.au",
    siteName: "Bookedai.au",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bookedai.au | The AI Revenue Engine for Service Businesses",
    description:
      "Bookedai.au captures demand across search, website, calls, email, and follow-up, then converts it into confirmed bookings and revenue automatically.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
