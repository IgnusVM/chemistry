import Link from "next/link";
import { LoginForm } from "./login-form";
import { PinLoginForm } from "./pin-login-form";
import { getTrustedDeviceUser } from "@/lib/device-trust";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fresh?: string }>;
}) {
  const { next, fresh } = await searchParams;
  const trustedUser = fresh ? null : await getTrustedDeviceUser();

  const showPinForm = trustedUser && trustedUser.pinHash;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Chemistry</h1>
        {showPinForm ? (
          <>
            <p className="mt-1 text-sm text-neutral-500">
              Welcome back, {trustedUser.playaName ?? trustedUser.displayName}. Enter your PIN.
            </p>
            <PinLoginForm next={next} />
            <Link href="/login?fresh=1" className="mt-4 block text-center text-xs text-neutral-400 hover:text-neutral-600">
              Not you? Sign in with email
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-neutral-500">
              Sign in with your email — we&apos;ll send you a link.
            </p>
            <LoginForm next={next} />
          </>
        )}
      </div>
    </div>
  );
}
