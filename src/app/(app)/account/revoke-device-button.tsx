"use client";

import { useTransition } from "react";
import { revokeTrustedDevice } from "./actions";

export function RevokeDeviceButton({ deviceId }: { deviceId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => revokeTrustedDevice(deviceId))}
      className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
    >
      Forget this device
    </button>
  );
}
