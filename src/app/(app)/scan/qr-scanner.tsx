"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flashlight, FlashlightOff, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/button";
import { parseAssetTagFromScan } from "@/lib/qr-scan";

type DetectorLike = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };

/**
 * Prefers the browser's own BarcodeDetector (Android Chrome — instant, and skips
 * the ~1MB wasm download entirely) and falls back to barcode-detector's
 * zxing-wasm ponyfill everywhere else, which is every browser on iOS since
 * WebKit doesn't implement the API. The wasm is served from our own origin, not
 * the library's default CDN, so scanning still works on a weak field connection.
 */
async function createDetector(): Promise<DetectorLike> {
  const Native = (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector as
    | (new (o: { formats: string[] }) => DetectorLike)
    | undefined;

  if (Native) {
    try {
      const supported = await (
        Native as unknown as { getSupportedFormats?: () => Promise<string[]> }
      ).getSupportedFormats?.();
      if (!supported || supported.includes("qr_code")) {
        return new Native({ formats: ["qr_code"] });
      }
    } catch {
      // Fall through to the ponyfill.
    }
  }

  const mod = await import("barcode-detector/ponyfill");
  mod.setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith(".wasm") ? "/zxing_reader.wasm" : prefix + path,
  });
  return new mod.BarcodeDetector({ formats: ["qr_code"] }) as DetectorLike;
}

export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Guards against the detect loop firing a second navigation mid-transition.
  const handledRef = useRef(false);

  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [manualTag, setManualTag] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;

    async function run() {
      if (!window.isSecureContext) {
        setError("Camera access needs a secure (https) connection.");
        setStatus("error");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser doesn't support camera access.");
        setStatus("error");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access for this site, then try again."
            : name === "NotFoundError"
              ? "No camera found on this device."
              : "Couldn't start the camera.",
        );
        setStatus("error");
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Autoplay rejection is non-fatal; the stream still renders once visible.
      }

      const track = stream.getVideoTracks()[0];
      setTorchSupported(Boolean((track?.getCapabilities?.() as { torch?: boolean })?.torch));

      let detector: DetectorLike;
      try {
        detector = await createDetector();
      } catch {
        if (cancelled) return;
        setError("Couldn't load the QR scanner.");
        setStatus("error");
        return;
      }
      if (cancelled) return;
      setStatus("scanning");

      const tick = async () => {
        if (cancelled || handledRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          try {
            const results = await detector.detect(video);
            for (const r of results) {
              const tag = parseAssetTagFromScan(r.rawValue);
              if (tag) {
                handledRef.current = true;
                navigator.vibrate?.(60);
                stop();
                router.push(`/a/${encodeURIComponent(tag)}`);
                return;
              }
            }
          } catch {
            // A single dropped frame is normal — keep scanning.
          }
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stop();
    };
  }, [router, stop]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // `torch` is a real, widely-shipped constraint but isn't in TS's DOM lib yet.
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const tag = parseAssetTagFromScan(manualTag);
    if (!tag) return;
    stop();
    router.push(`/a/${encodeURIComponent(tag)}`);
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="aspect-[3/4] w-full object-cover sm:aspect-video"
        />

        {status === "scanning" && (
          <>
            {/* Framing guide — purely visual; detection runs on the whole frame. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-2xl border-2 border-onaccent/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-pressed={torchOn}
                className="absolute bottom-3 right-3 rounded-full bg-onaccent/90 p-3 text-neutral-900 dark:text-neutral-50 shadow-md"
                aria-label={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
              >
                {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
              </button>
            )}
          </>
        )}

        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-onaccent/80">
            <Loader2 className="h-6 w-6 animate-spin" />
            Starting camera…
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-onaccent/80">
            <CameraOff className="h-7 w-7" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {status === "scanning" && (
        <p className="text-center text-sm text-neutral-500">
          Point the camera at an asset&rsquo;s QR sticker.
        </p>
      )}

      <form onSubmit={submitManual} className="space-y-2 rounded-md border border-neutral-200 bg-white p-4">
        <label htmlFor="manual-tag" className="block text-xs font-medium text-neutral-600">
          Or type the asset tag
        </label>
        <div className="flex gap-2">
          <input
            id="manual-tag"
            value={manualTag}
            onChange={(e) => setManualTag(e.target.value)}
            placeholder="LL-0001"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-base"
          />
          <Button type="submit" disabled={!parseAssetTagFromScan(manualTag)}>
            Go
          </Button>
        </div>
        <p className="text-xs text-neutral-400">
          Useful when a sticker is damaged or the light is bad.
        </p>
      </form>
    </div>
  );
}
