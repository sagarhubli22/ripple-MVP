import type { Metadata } from "next";

import "./globals.css";
import { Navbar } from "../components/Navbar";
import { ConditionalLayout } from "../components/ConditionalLayout";

export const metadata: Metadata = {
  title: "Ripple Dashboard",
  description: "Foundation for Ripple MVP dashboard experience."
};

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

