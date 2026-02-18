import Link from "next/link";

const links = [
  { href: "/today", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  return (
    <nav className="mt-8 grid grid-cols-3 gap-2 text-center text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md bg-white px-3 py-2 shadow-sm"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
