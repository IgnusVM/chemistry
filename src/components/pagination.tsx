import Link from "next/link";

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
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      qs.set(key, value);
    }
    if (p > 1) qs.set("page", String(p));
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-sm text-neutral-500">
      <span>
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="text-neutral-700 hover:underline">
            ← Prev
          </Link>
        ) : (
          <span className="text-neutral-300">← Prev</span>
        )}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className="text-neutral-700 hover:underline">
            Next →
          </Link>
        ) : (
          <span className="text-neutral-300">Next →</span>
        )}
      </div>
    </div>
  );
}
