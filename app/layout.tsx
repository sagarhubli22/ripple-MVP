import type { Metadata } from "next";

import "./globals.css";
import { Navbar } from "../components/Navbar";
import { ConditionalLayout } from "../components/ConditionalLayout";

export const metadata: Metadata = {
  title: "Ripple Dashboard",
  description: "Foundation for Ripple MVP dashboard experience.",
  icons: {
    // Apple touch icon for iOS devices
    apple: "/apple-touch-icon.png",
    // Standard favicons for Android/Chrome
    other: [
      {
        rel: "icon",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
      },
      {
        rel: "icon",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
      },
    ],
  },
};

// Note: Main favicon is automatically handled by Next.js App Router using app/icon.png

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}

