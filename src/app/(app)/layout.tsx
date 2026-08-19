import Link from "next/link";
import { requireCurrentUser } from "@/lib/dal";
import { logout } from "@/lib/auth-actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-5 text-sm font-medium text-neutral-700">
            <Link href="/" className="text-neutral-900 font-semibold">
              Chemistry
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
            <Link href="/locations" className="hover:text-neutral-900">
              Locations
            </Link>
            {user.isOrgAdmin && (
              <>
                <Link href="/admin/divisions" className="hover:text-neutral-900">
                  Divisions
                </Link>
                <Link href="/admin/departments" className="hover:text-neutral-900">
                  Departments
                </Link>
                <Link href="/admin/users" className="hover:text-neutral-900">
                  Users
                </Link>
                <Link href="/admin/asset-types" className="hover:text-neutral-900">
                  Asset Types
                </Link>
                <Link href="/admin/failure-codes" className="hover:text-neutral-900">
                  Failure Codes
                </Link>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm text-neutral-600">
            <Link href="/account" className="hover:text-neutral-900">
              {user.playaName ?? user.displayName}
            </Link>
            <form action={logout}>
              <button type="submit" className="text-neutral-500 hover:text-neutral-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </div>
  );
}
