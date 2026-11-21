import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const interDisplay = Inter({
  subsets: ["latin"],
  variable: "--font-inter-display",
  display: "swap",
  weight: ["600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ReconX — Evidence-backed security assessments",
    template: "%s · ReconX",
  },
  description:
    "ReconX is an authorization-first security assessment platform. Human-approved scope, deterministic policy enforcement, and every finding traceable to cryptographic evidence.",
  keywords: [
    "security assessment",
    "vulnerability scanning",
    "penetration testing",
    "compliance",
    "evidence-backed",
    "authorization",
  ],
  authors: [{ name: "ReconX Team" }],
  creator: "ReconX",
  publisher: "ReconX",
  robots: "index, follow",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg",    type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://reconx.dev",
    siteName: "ReconX",
    title: "ReconX — Evidence-backed security assessments",
    description:
      "ReconX is an authorization-first security assessment platform. Human-approved scope, deterministic policy enforcement, and every finding traceable to cryptographic evidence.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ReconX Security Assessment Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReconX — Evidence-backed security assessments",
    description:
      "Authorization-first security assessment platform with cryptographic evidence.",
    images: ["/og-image.png"],
    creator: "@reconx",
  },
  verification: {
    other: {
      "google-site-verification": "your-verification-code",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interDisplay.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.reconx.dev" />
      </head>
      <body className="min-h-screen bg-background font-sans text-text antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}