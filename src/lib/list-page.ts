// 10 rather than 15 so a default page clears the viewport without scrolling —
// 15 was just over the line on the laptop sizes this actually gets used on.
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250] as const;
export const DEFAULT_PAGE_SIZE: number = PAGE_SIZE_OPTIONS[0];

export function parsePage(pageParam: string | undefined): number {
  const n = Number(pageParam);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function parsePageSize(pageSizeParam: string | undefined): number {
  const n = Number(pageSizeParam);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}
