export const PAGE_SIZE = 50;

export function parsePage(pageParam: string | undefined): number {
  const n = Number(pageParam);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
