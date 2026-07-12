import type { Metadata } from "next";
import { Geist_Mono, Raleway } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

/**
 * Raleway carries the interface; Geist Mono carries the codes.
 *
 * The pairing is doing real work, not decoration. Asset tags (AF-0101), serial
 * numbers (C02X1234JGH5) and times are read CHARACTER BY CHARACTER — someone is
 * matching a sticker on a laptop against a row on a screen. A proportional font
 * makes that genuinely harder: 1/l/I and 0/O collapse together, and nothing
 * lines up down a column. So they stay monospaced.
 *
 * Only the weights actually used are loaded — Raleway ships nine, and shipping
 * all of them would be several hundred KB of font for weights nothing renders.
 */
const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AssetFlow — Enterprise Asset & Resource Management",
  description:
    "Track, allocate, book, maintain and audit an organisation's physical assets and shared resources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      // `dark` is rendered on the SERVER, not added by script. Dark is the app's
      // intended look, so it must be right in the very first byte of HTML —
      // adding it client-side would flash white first. The script below only
      // REMOVES it, for the minority who choose light.
      className={`${raleway.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        {/*
          Applies the user's theme choice BEFORE the browser paints.

          This can't be done in React: by the time a component mounts the page is
          already on screen, so someone who picked light mode would see a dark
          flash on every single load. A tiny inline script in <head> is the only
          place early enough. No network round-trip; runs in well under a
          millisecond.

          `suppressHydrationWarning` is required because this mutates the class
          list before React hydrates — React would otherwise (correctly) complain
          that the server markup and the live DOM disagree.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'light') {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
