"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { rollbackAssetCodeVersion } from "@/app/(app)/admin/asset-types/code-file-actions";

const CodeMirrorEditor = dynamic(() => import("@/components/code/code-mirror-editor").then((m) => m.CodeMirrorEditor), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-md border border-neutral-300 bg-neutral-50" />,
});
const DiffView = dynamic(() => import("@/components/code/diff-view").then((m) => m.DiffView), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-md border border-neutral-300 bg-neutral-50" />,
});

export type CodeVersionRow = {
  id: string;
  content: string;
  message: string | null;
  createdAt: Date;
  createdBy: { displayName: string } | null;
  workOrder: { code: string } | null;
};

export function CodeFileVersionHistory({
  codeFileId,
  filename,
  versions,
}: {
  codeFileId: string;
  filename: string;
  versions: CodeVersionRow[];
}) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compareVersions = useMemo(
    () => compareIds.map((id) => versions.find((v) => v.id === id)).filter((v): v is CodeVersionRow => Boolean(v)),
    [compareIds, versions],
  );

  const rollback = (targetVersionId: string) => {
    const formData = new FormData();
    formData.set("codeFileId", codeFileId);
    formData.set("targetVersionId", targetVersionId);
    startTransition(() => rollbackAssetCodeVersion(formData));
  };

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="w-8 py-1" />
            <th className="py-1 pr-2">Message</th>
            <th className="py-1 pr-2">By</th>
            <th className="py-1 pr-2">When</th>
            <th className="py-1 pr-2">Work order</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {versions.map((v, i) => (
            <tr key={v.id}>
              <td className="py-2">
                <input
                  type="checkbox"
                  checked={compareIds.includes(v.id)}
                  onChange={() => toggleCompare(v.id)}
                  aria-label={`Select version from ${v.createdAt.toLocaleString()} for comparison`}
                />
              </td>
              <td className="py-2 pr-2 text-neutral-900">
                {v.message || (i === versions.length - 1 ? "Initial version" : "—")}
              </td>
              <td className="py-2 pr-2 text-neutral-500">{v.createdBy?.displayName ?? "Unknown"}</td>
              <td className="py-2 pr-2 text-neutral-500">{v.createdAt.toLocaleString()}</td>
              <td className="py-2 pr-2 text-neutral-500">
                {v.workOrder ? (
                  <Link href={`/work-orders/${v.workOrder.code}`} className="hover:underline">
                    {v.workOrder.code}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 text-right">
                {i !== 0 && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => rollback(v.id)}
                    className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
                  >
                    Rollback to this
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {compareVersions.length === 2 && (
        <div>
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">Comparing selected versions</p>
          <div className="mt-1">
            <DiffView
              oldValue={compareVersions[1].content}
              newValue={compareVersions[0].content}
              oldTitle={compareVersions[1].createdAt.toLocaleString()}
              newTitle={compareVersions[0].createdAt.toLocaleString()}
            />
          </div>
        </div>
      )}
      {compareVersions.length === 1 && (
        <div>
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
            Version from {compareVersions[0].createdAt.toLocaleString()}
          </p>
          <div className="mt-1">
            <CodeMirrorEditor filename={filename} value={compareVersions[0].content} readOnly />
          </div>
        </div>
      )}
    </div>
  );
}
