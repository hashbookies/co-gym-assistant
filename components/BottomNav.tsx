"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, BoltIcon, BookIcon, ChartIcon, GearIcon } from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Today", Icon: HomeIcon },
  { href: "/generator", label: "Generate", Icon: BoltIcon },
  { href: "/library", label: "Library", Icon: BookIcon },
  { href: "/history", label: "History", Icon: ChartIcon },
  { href: "/settings", label: "Settings", Icon: GearIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-stone-200/80 bg-white/90 shadow-nav backdrop-blur sm:max-w-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 px-2 py-1.5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`mx-auto flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10.5px] font-semibold transition ${
                  active ? "bg-brand-50 text-brand-700" : "text-stone-400 hover:text-stone-600"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
