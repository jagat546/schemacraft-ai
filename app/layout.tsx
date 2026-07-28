import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SchemaCraft AI",
  description: "Generate SQL schema, Drizzle models, and sample data from a prompt.",
};

// Account Settings §Accessibility (S4-010B): applies reduced-motion/
// high-contrast before first paint, entirely client-side -- reading
// cookies() here (a Next.js Dynamic API) would force every route using
// this root layout, including the public marketing page, out of static
// rendering. Confirmed directly: doing that flipped `/`, `/signup`,
// `/reset-password`, and `/_not-found` from static (○) to dynamic (ƒ) in
// the build output. next-themes -- the pattern this was meant to mirror --
// avoids exactly this by never touching the server at all: it injects a
// plain <script> reading localStorage, applied before hydration. This is
// the same technique, reading document.cookie instead (cookies are set by
// lib/actions/account-preferences.actions.ts, and need to survive a full
// page load, not just a client session, so localStorage isn't the right
// store here).
const ACCESSIBILITY_INIT_SCRIPT = `
(function() {
  try {
    var cookies = document.cookie.split("; ").reduce(function (acc, part) {
      var eq = part.indexOf("=");
      if (eq > -1) acc[part.slice(0, eq)] = part.slice(eq + 1);
      return acc;
    }, {});
    var root = document.documentElement;
    if (cookies["reduced-motion"] === "true") root.classList.add("reduced-motion");
    if (cookies["high-contrast"] === "true") root.classList.add("high-contrast");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ACCESSIBILITY_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
