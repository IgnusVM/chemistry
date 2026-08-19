import "server-only";
import QRCode from "qrcode";

export function assetScanUrl(assetTag: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return new URL(`/a/${assetTag}`, base).toString();
}

export async function assetQrDataUrl(assetTag: string) {
  return QRCode.toDataURL(assetScanUrl(assetTag), { margin: 1, width: 240 });
}
