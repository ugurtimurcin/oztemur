import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Öztemur Admin · Management Console",
  description: "Corporate management console for Öztemur Group of Companies",
  // Admin panel must never appear in search results — leaks the login URL
  // and signals there's something worth attacking. Belt-and-braces: meta
  // robots here + a robots.txt blocking '*' at the admin domain when one
  // is configured.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
