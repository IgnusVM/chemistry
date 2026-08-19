import { redirect } from "next/navigation";

export default async function ScanRedirectPage({
  params,
}: {
  params: Promise<{ assetTag: string }>;
}) {
  const { assetTag } = await params;
  redirect(`/assets/${assetTag}`);
}
