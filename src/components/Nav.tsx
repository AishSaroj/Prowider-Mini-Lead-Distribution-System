"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/request-service", label: "Request Service" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/test-tools", label: "Test Tools" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/request-service" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-bold text-white shadow-md shadow-teal-600/30">
            P
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900 group-hover:text-teal-700">
            Prowider
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
