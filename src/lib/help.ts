import { marked } from "marked";

export const HELP_CATEGORIES = [
  { slug: "getting-started", label: "Getting Started" },
  { slug: "assets", label: "Assets" },
  { slug: "locations", label: "Locations" },
  { slug: "work-orders", label: "Work Orders" },
  { slug: "photos-documents", label: "Photos & Documents" },
  { slug: "qr-codes", label: "QR Codes & Scanning" },
  { slug: "accounts", label: "Accounts & Notifications" },
  { slug: "admin-setup", label: "Admin & Setup" },
  { slug: "troubleshooting", label: "Troubleshooting" },
] as const;

export type HelpCategorySlug = (typeof HELP_CATEGORIES)[number]["slug"];

export function categoryLabel(slug: string) {
  return HELP_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function isValidCategory(slug: string): slug is HelpCategorySlug {
  return HELP_CATEGORIES.some((c) => c.slug === slug);
}

export function renderHelpMarkdown(body: string) {
  return marked.parse(body, { async: false, gfm: true, breaks: false });
}
