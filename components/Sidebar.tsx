"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/overview" },
  { label: "Analytics", href: "/analytics" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 flex-col gap-2 border-r border-slate-800 bg-slate-950/60 p-4 md:flex">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Navigation
      </p>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${isActive
                  ? "bg-indigo-500/20 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

