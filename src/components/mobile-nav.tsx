"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Boxes,
  ScanLine,
  ClipboardList,
  Menu,
  X,
  Layers,
  PackageOpen,
  LayoutGrid,
  MapPin,
  Settings,
  HelpCircle,
  UserRound,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/auth-actions";
import { ThemeToggle } from "@/components/theme";

type Item = { href: string; label: string; Icon: typeof Home };

const TABS: Item[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/assets", label: "Assets", Icon: Boxes },
  { href: "/work-orders", label: "Tickets", Icon: ClipboardList },
];

const MORE_LINKS: Item[] = [
  { href: "/board", label: "Board", Icon: LayoutGrid },
  { href: "/loans", label: "Checked out", Icon: PackageOpen },
  { href: "/asset-groups", label: "Asset Groups", Icon: Layers },
  { href: "/locations", label: "Locations", Icon: MapPin },
  { href: "/account", label: "Account", Icon: UserRound },
  { href: "/help", label: "Help & Guide", Icon: HelpCircle },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Thumb-reachable bottom tab bar, phones only (hidden at sm+). Scan sits in the
 * middle as the largest target because it's the one thing people do while
 * standing in front of an asset holding a phone in one hand.
 */
export function MobileNav({ isOrgAdmin }: { isOrgAdmin: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Don't trap the user behind a scrollable body while the sheet is open.
  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [moreOpen]);

  const links = isOrgAdmin
    ? [...MORE_LINKS, { href: "/admin", label: "Admin", Icon: Settings }]
    : MORE_LINKS;

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-neutral-900/40"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom)+5rem)] shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <span className="text-sm font-semibold text-neutral-900">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-md p-1 text-neutral-400 hover:text-neutral-700"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-neutral-800">Theme</span>
              <ThemeToggle />
            </div>
            <nav className="divide-y divide-neutral-100 border-t border-neutral-100">
              {links.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  // Dismiss on tap rather than reacting to a pathname change —
                  // navigating to the page you're already on wouldn't fire that.
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm text-neutral-800 active:bg-neutral-50"
                >
                  <Icon className="h-5 w-5 text-neutral-400" />
                  {label}
                </Link>
              ))}
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-sm text-neutral-800 active:bg-neutral-50"
                >
                  <LogOut className="h-5 w-5 text-neutral-400" />
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden">
        <div className="flex items-stretch">
          {TABS.slice(0, 2).map(({ href, label, Icon }) => (
            <TabLink key={href} href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
          ))}

          <Link
            href="/scan"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
            aria-label="Scan a QR tag"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fuchsia-600 text-onaccent shadow-md shadow-fuchsia-600/30">
              <ScanLine className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-medium text-neutral-500">Scan</span>
          </Link>

          {TABS.slice(2).map(({ href, label, Icon }) => (
            <TabLink key={href} href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-neutral-500"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function TabLink({ href, label, Icon, active }: Item & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 ${
        active ? "text-fuchsia-700" : "text-neutral-500"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
