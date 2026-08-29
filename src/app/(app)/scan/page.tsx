import { requireCurrentUser } from "@/lib/dal";
import { QrScanner } from "./qr-scanner";
import { HelpLink } from "@/components/help-link";

export const metadata = { title: "Scan — Chemistry" };

export default async function ScanPage() {
  await requireCurrentUser();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">Scan</h1>
          <HelpLink topic="Scanning" article="qr-codes/qr-codes-and-scanning" />
        </div>
      </div>
      {/* QrScanner is a client component; the camera and the ~1MB wasm decoder
          are both pulled in from inside its effect, so nothing browser-only is
          touched during SSR and the decoder stays out of the initial bundle. */}
      <QrScanner />
    </div>
  );
}
