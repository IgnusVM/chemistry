import Link from "next/link";
import { requireCurrentUser } from "@/lib/dal";
import { logout } from "@/lib/auth-actions";
import { resolveBadge } from "@/lib/user-badge-data";
import { UserBadge } from "@/components/user-badge";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  const badge = await resolveBadge(user);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          {/* Full nav is desktop-only; phones get the bottom tab bar instead. */}
          <nav className="hidden items-center gap-5 text-sm font-medium text-neutral-700 sm:flex">
            <Link href="/" className="text-neutral-900 font-semibold">
              Dashboard
            </Link>
            <Link href="/assets" className="hover:text-neutral-900">
              Assets
            </Link>
            <Link href="/asset-groups" className="hover:text-neutral-900">
              Asset Groups
            </Link>
            <Link href="/work-orders" className="hover:text-neutral-900">
              Work Orders
            </Link>
            <Link href="/loans" className="hover:text-neutral-900">
              Loans
            </Link>
            {user.isOrgAdmin && (
              <Link href="/admin" className="hover:text-neutral-900">
                Admin
              </Link>
            )}
            <Link href="/help" className="ml-2 border-l border-neutral-200 pl-5 hover:text-neutral-900">
              Help
            </Link>
          </nav>

          <Link href="/" className="text-sm font-semibold text-neutral-900 sm:hidden">
            Chemistry
          </Link>

          <div className="flex min-w-0 items-center gap-3 text-sm text-neutral-600">
            <Link href="/account" className="inline-flex min-w-0 items-center gap-1.5 hover:text-neutral-900">
              <UserBadge badge={badge} />
              <span className="truncate">{user.displayName}</span>
            </Link>
            <form action={logout} className="hidden sm:block">
              <button type="submit" className="text-neutral-500 hover:text-neutral-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Bottom padding on phones keeps the last row clear of the fixed tab bar. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:pb-6 print:max-w-none print:px-0 print:py-0">
        {children}
      </main>

      <MobileNav isOrgAdmin={user.isOrgAdmin} />
    </div>
  );
}
