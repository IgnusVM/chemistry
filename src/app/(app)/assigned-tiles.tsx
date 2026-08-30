import Link from "next/link";
import { WORK_ORDER_STATUS_STYLES as STATUS_STYLES } from "@/lib/status-styles";

type Assigned = { id: string; code: string; description: string; status: string; priority: string };

/**
 * "Assigned to you", as square tiles.
 *
 * Same shape as the board's in-flight grid, for the same reason: as full-width
 * rows this was one line per ticket down the middle of the dashboard, and the
 * status badge ended up flung to the far edge on a wide screen. Tiles survey
 * well — you read the shape of your workload rather than a list.
 */
export function AssignedTiles({ workOrders }: { workOrders: Assigned[] }) {
  if (workOrders.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Assigned to you</h2>
        <p className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          Nothing assigned to you right now.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">
        Assigned to you{" "}
        <span className="font-normal text-neutral-500">({workOrders.length})</span>
      </h2>
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
        {workOrders.map((wo) => (
          <li key={wo.id}>
            <Link
              href={`/work-orders/${wo.code}`}
              className="flex aspect-square flex-col rounded-lg border border-neutral-200 bg-white p-3 hover:border-neutral-300 hover:bg-neutral-50"
            >
              <span className="truncate font-mono text-[11px] text-neutral-500">{wo.code}</span>
              <span className="mt-1 line-clamp-3 text-sm leading-snug font-medium text-neutral-900">
                {wo.description}
              </span>
              <span className="mt-auto flex flex-wrap items-center gap-1 pt-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLES[wo.status]}`}>
                  {wo.status.replace("_", " ")}
                </span>
                {wo.priority === "EVENT_CRITICAL" || wo.priority === "HIGH" ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
                    {wo.priority.replace("_", " ")}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
