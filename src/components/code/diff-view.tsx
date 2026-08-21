"use client";

import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

export function DiffView({
  oldValue,
  newValue,
  oldTitle,
  newTitle,
}: {
  oldValue: string;
  newValue: string;
  oldTitle?: string;
  newTitle?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-300 text-xs">
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        leftTitle={oldTitle}
        rightTitle={newTitle}
        splitView
        compareMethod={DiffMethod.LINES}
        disableWordDiff={false}
      />
    </div>
  );
}
