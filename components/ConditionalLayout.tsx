"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = pathname === "/signin" || pathname?.startsWith("/auth/");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col md:flex-row">
        {!hideSidebar && <Sidebar />}
        <main
          className={`flex-1 ${hideSidebar ? "" : "px-4 py-6 md:px-8"}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

