import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { SecurityProvider } from '@/contexts/security-context'
import { FeatureBaseScript } from '@/components/featurebase-script'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Poge - Modern PostgreSQL Database Management Tool | Database GUI & Admin',
  description: 'Poge is a modern, browser-native PostgreSQL database management tool. Connect to any database, write SQL queries, manage schemas, and collaborate with built-in security. Free PostgreSQL GUI alternative to pgAdmin, DBeaver, and Navicat.',
  keywords: [
    'PostgreSQL',
    'database management',
    'SQL editor',
    'database GUI',
    'PostgreSQL admin',
    'database tool',
    'SQL client',
    'database browser',
    'pgAdmin alternative',
    'DBeaver alternative',
    'Navicat alternative',
    'database IDE',
    'SQL development',
    'database administration',
    'PostgreSQL client',
    'database management system',
    'SQL query tool',
    'database schema',
    'database visualization',
    'PostgreSQL GUI',
    'database collaboration',
    'web-based database tool',
    'browser database client',
    'PostgreSQL management',
    'database security',
    'SQL development environment'
  ],
  authors: [{ name: 'Poge Team' }],
  creator: 'Poge',
  publisher: 'Poge',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://poge.dev'),

  openGraph: {
    title: 'Poge - Modern PostgreSQL Database Management Tool',
    description: 'Connect to any database, write SQL queries, manage schemas, and collaborate with built-in security. Free PostgreSQL GUI alternative to pgAdmin, DBeaver, and Navicat.',
    url: 'https://poge.dev',
    siteName: 'Poge',
    images: [
      {
        url: '/Pogo Brand mark.png',
        width: 1200,
        height: 630,
        alt: 'Poge - PostgreSQL Database Management Tool',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Poge - Modern PostgreSQL Database Management Tool',
    description: 'Connect to any database, write SQL queries, manage schemas, and collaborate with built-in security.',
    images: ['/Pogo Brand mark.png'],
    creator: '@poge_dev',
    site: '@poge_dev',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'Technology',
  classification: 'Database Management Software',
  other: {
    'application-name': 'Poge',
    'apple-mobile-web-app-title': 'Poge',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#10b981',
    'theme-color': '#10b981',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicon and App Icons */}
        <link rel="icon" href="/Poge Logo For Favicon.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/Poge Logo For Favicon.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/Poge Logo For Favicon.png" sizes="180x180" />
        <link rel="icon" href="/Poge Logo For Favicon.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/Poge Logo For Favicon.png" type="image/png" sizes="512x512" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />

        {/* Fonts - Using local fonts (JetBrains Mono and Manrope) */}

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Poge",
              "description": "Modern PostgreSQL database management tool with browser-native interface",
              "url": "https://poge.dev",
              "applicationCategory": "DatabaseApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "Poge Team"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150"
              },
              "keywords": "PostgreSQL, database management, SQL editor, database GUI, pgAdmin alternative"
            })
          }}
        />

        {/* Custom Styles */}
        <style>{`
html {
  font-family: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-sans: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Monaco', 'Consolas', 'Courier New', monospace;
  --font-serif: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Monaco', 'Consolas', 'Courier New', monospace;
}
        `}</style>

        {/* FeatureBase Widget */}
        <FeatureBaseScript />
      </head>
      <body>
        <SecurityProvider>
          {children}
        </SecurityProvider>

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-BMRMHKKBFX"
          strategy="afterInteractive"
        />
        <Script id="ga-gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-BMRMHKKBFX');
          `}
        </Script>

        {/* Additional SEO Scripts */}
        <Script id="seo-enhancement" strategy="afterInteractive">
          {`
            // Add meta description for better SEO
            if (!document.querySelector('meta[name="description"]')) {
              const meta = document.createElement('meta');
              meta.name = 'description';
              meta.content = 'Poge is a modern, browser-native PostgreSQL database management tool. Connect to any database, write SQL queries, manage schemas, and collaborate with built-in security.';
              document.head.appendChild(meta);
            }
            
            // Add keywords meta tag
            if (!document.querySelector('meta[name="keywords"]')) {
              const meta = document.createElement('meta');
              meta.name = 'keywords';
              meta.content = 'PostgreSQL, database management, SQL editor, database GUI, pgAdmin alternative, DBeaver alternative, database tool, SQL client';
              document.head.appendChild(meta);
            }
          `}
        </Script>

        <Analytics />
      </body>
    </html>
  )
}
