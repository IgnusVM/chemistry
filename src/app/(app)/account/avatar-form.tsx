"use client";

import { useRef, useState, useTransition } from "react";
import { uploadAvatar, removeAvatar, type AvatarFormState } from "./actions";
import { Button } from "@/components/button";

export function AvatarForm({ avatarUrl }: { avatarUrl: string | null }) {
  const [state, setState] = useState<AvatarFormState>(undefined);
  const [pending, startTransition] = useTransition();
  const [removing, startRemoveTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Profile picture</h2>
      <p className="text-xs text-neutral-500">Used as your badge next to your name. Leave unset to use an icon instead.</p>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-neutral-200" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-400">
            None
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await uploadAvatar(undefined, formData);
              setState(result);
              if (!result || !("error" in result)) formRef.current?.reset();
            });
          }}
          className="min-w-0 flex-1 space-y-2"
        >
          {/* A file input's intrinsic width is wider than a small phone, so it
              has to be explicitly constrained or it pushes the page sideways. */}
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="block w-full max-w-full text-sm"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" pending={pending} pendingText="Uploading…">
              Upload
            </Button>
            {avatarUrl && (
              <button
                type="button"
                disabled={removing}
                onClick={() => startRemoveTransition(() => removeAvatar())}
                className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </form>
      </div>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
