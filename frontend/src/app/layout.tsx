import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://izra.ai"),
  title: {
    default: "Izra — Intelligent University Assistant",
    template: "%s | Izra",
  },
  description:
    "Izra provides 24/7 AI-powered guidance for students, parents, and admission seekers. Get verified university information, emergency support, and admission process guidance.",
  keywords: [
    "university assistant",
    "AI chatbot",
    "LPU",
    "admission guidance",
    "student support",
    "college assistant",
    "Izra",
  ],
  authors: [{ name: "Izra" }],
  creator: "Izra",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://izra.ai",
    siteName: "Izra",
    title: "Izra — Intelligent University Assistant",
    description:
      "24/7 AI-powered university guidance for students, parents, and admission seekers.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Izra AI",
    description: "AI-powered university assistant platform",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Izra",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // Crucial for PWA notch support
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Dark mode initializer — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('izra-theme') ||
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} antialiased`}>
        {children}
        {/* PWA Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[PWA] SW registered'); })
                    .catch(function(err) { console.log('[PWA] SW failed:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
