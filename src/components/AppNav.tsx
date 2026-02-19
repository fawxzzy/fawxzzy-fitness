"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/today", label: "Today" },
  { href: "/routines", label: "Routines" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();

  const visibleLinks = links.filter((link) => link.href !== pathname);

  return (
    <nav className="mt-8 grid grid-cols-3 gap-2 text-center text-sm">
      {visibleLinks.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-md bg-white px-3 py-2 shadow-sm">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
