import Link from "next/link";
import { findValidInvite } from "@/lib/invite";
import { JoinForm } from "./join-form";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite: token } = await searchParams;
  const invite = token ? await findValidInvite(token) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Chemistry</h1>
        {invite && token ? (
          <>
            <p className="mt-1 text-sm text-neutral-500">You&apos;ve been invited — create your account.</p>
            <JoinForm token={token} />
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-neutral-500">
              This invite link is invalid or has expired. Ask an admin for a new one.
            </p>
            <Link href="/login" className="mt-4 block text-center text-xs text-neutral-400 hover:text-neutral-600">
              Already have an account? Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
