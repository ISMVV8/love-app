import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Love App — Trouve ta personne',
  description: "L'app de rencontre premium. Swipe, matche, discute.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Love App',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        {/* PWA — Apple specific */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Love App" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Prevent phone number detection */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="bg-[#09090B] text-white antialiased overscroll-none">
        {children}
      </body>
    </html>
  );
}
