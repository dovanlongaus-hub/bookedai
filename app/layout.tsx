import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookedAI.au | The AI Revenue Engine for Service Businesses",
  description:
    "BookedAI.au captures demand across search, website, calls, email, and follow-up — then converts it into confirmed bookings and revenue automatically.",
  metadataBase: new URL("https://bookedai.au"),
  openGraph: {
    title: "BookedAI.au | The AI Revenue Engine for Service Businesses",
    description:
      "Turn search, calls, emails, and enquiries into revenue with one revenue engine for service businesses.",
    url: "https://bookedai.au",
    siteName: "BookedAI.au",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BookedAI.au | The AI Revenue Engine for Service Businesses",
    description:
      "BookedAI.au captures demand across search, website, calls, email, and follow-up — then converts it into confirmed bookings and revenue automatically.",
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
