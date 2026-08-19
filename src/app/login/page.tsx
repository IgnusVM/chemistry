import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Chemistry</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sign in with your email — we&apos;ll send you a link.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
