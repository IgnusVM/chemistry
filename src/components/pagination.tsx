import Link from "next/link";
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "@/lib/list-page";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const hrefFor = (p: number, size: number = pageSize) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || key === "pageSize" || value === undefined) continue;
      qs.set(key, value);
    }
    if (size !== DEFAULT_PAGE_SIZE) qs.set("pageSize", String(size));
    if (p > 1) qs.set("page", String(p));
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
      <span>
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-neutral-400">Show:</span>
        {PAGE_SIZE_OPTIONS.map((size) => (
          <Link
            key={size}
            href={hrefFor(1, size)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              size === pageSize ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {size}
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className="text-neutral-700 hover:underline">
              ← Prev
            </Link>
          ) : (
            <span className="text-neutral-400">← Prev</span>
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className="text-neutral-700 hover:underline">
              Next →
            </Link>
          ) : (
            <span className="text-neutral-400">Next →</span>
          )}
        </div>
      )}
    </div>
  );
}
