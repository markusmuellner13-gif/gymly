import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import { APPLE_SPLASH } from "@/lib/splash";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gymly.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gymly — Your training, tracked",
    template: "%s · Gymly",
  },
  description:
    "Build a push/pull/legs plan, track every set and the weight you move, and time your sessions. A fast, offline-ready gym log.",
  applicationName: "Gymly",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gymly",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "Gymly",
    title: "Gymly — Your training, tracked",
    description:
      "Build your split, log every set, and watch the kilos add up. Free, fast, and installable.",
    images: ["/icons/og.png"],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom stays available for accessibility; iOS input zoom is prevented with
  // a 16px minimum font size instead of locking the viewport.
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {/* iOS has no manifest-driven splash: one image per device resolution. */}
        {APPLE_SPLASH.map((s) => (
          <link key={s.href} rel="apple-touch-startup-image" media={s.media} href={s.href} />
        ))}
      </head>
      <body className="min-h-full flex flex-col bg-base text-text">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
