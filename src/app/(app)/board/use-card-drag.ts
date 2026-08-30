"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dragging a card between columns, on a mouse and on a finger.
 *
 * Built on Pointer Events rather than HTML5 drag-and-drop. HTML5 drag never
 * fires on touch, and the board is used on phones, so it was never an option
 * here — one code path covers mouse, pen and finger.
 *
 * The hard part on touch is that the board already uses the same gesture for
 * two other things: the column strip scrolls sideways and each column scrolls
 * down. So a drag has to be distinguishable from a scroll *before* it starts
 * moving anything:
 *
 *   - finger/pen: press and hold briefly. Moving before the hold completes is
 *     a scroll and cancels the drag outright.
 *   - mouse: a few pixels of movement is enough; nobody expects to wait.
 *
 * Once a drag is live, `touchmove` is cancelled at the document with a
 * non-passive listener. React's own handlers can be registered passive, where
 * preventDefault silently does nothing and the page scrolls away underneath
 * the card being dragged.
 */

const HOLD_MS = 220;          // finger: hold this long to pick a card up
const TOUCH_SLOP = 8;         // finger: moving further than this first = scroll
const MOUSE_SLOP = 5;         // mouse: moving this far = drag
const EDGE = 72;              // auto-scroll zone at the strip's edges
const EDGE_SPEED = 14;        // px per frame

export type DragPayload = {
  cardId: string;
  fromColumnId: string;
  hasWorkOrder: boolean;
  updatedAt: string | Date;
  title: string;
  width: number;
};

export function useCardDrag({
  enabled,
  canDropInto,
  onDrop,
  scrollRef,
}: {
  enabled: boolean;
  canDropInto: (columnId: string, dragged: DragPayload) => boolean;
  onDrop: (p: DragPayload, toColumnId: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [active, setActive] = useState<DragPayload | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Live values for listeners that are attached once per drag.
  const activeRef = useRef<DragPayload | null>(null);
  const overRef = useRef<string | null>(null);
  // Kept current in an effect, not during render. The drag listeners are
  // attached once per gesture and would otherwise close over the callbacks as
  // they were when the drag started.
  const canDropRef = useRef(canDropInto);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    canDropRef.current = canDropInto;
    onDropRef.current = onDrop;
  });

  // Pre-activation: a press that has not yet become a drag.
  const pending = useRef<{ x: number; y: number; payload: DragPayload; timer: number | null; touch: boolean } | null>(null);
  // A completed drag must not also fire the card's click and open the sheet.
  const suppressClick = useRef(false);
  const edge = useRef(0);

  const clearPending = useCallback(() => {
    if (pending.current?.timer) window.clearTimeout(pending.current.timer);
    pending.current = null;
  }, []);

  const stop = useCallback(() => {
    activeRef.current = null;
    overRef.current = null;
    setActive(null);
    setPoint(null);
    setOverColumnId(null);
    edge.current = 0;
  }, []);

  /** Which column is under the pointer? The ghost is pointer-events:none. */
  const columnAt = useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    const section = el?.closest<HTMLElement>("[data-column-id]");
    return section?.dataset.columnId ?? null;
  }, []);

  const begin = useCallback((payload: DragPayload, x: number, y: number) => {
    clearPending();
    activeRef.current = payload;
    setActive(payload);
    setPoint({ x, y });
    const col = columnAt(x, y);
    overRef.current = col;
    setOverColumnId(col);
    // Picking a card up is worth a bump on a phone, where there is no cursor
    // to tell you the gesture took.
    navigator.vibrate?.(12);
  }, [clearPending, columnAt]);

  /**
   * Auto-scroll the column strip while a drag hovers near its edge — without
   * it, a card can only be dropped on a column already on screen, which on a
   * phone is roughly one.
   */
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const loop = () => {
      const el = scrollRef.current;
      if (el && edge.current !== 0) el.scrollLeft += edge.current;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active, scrollRef]);

  // While a drag is live: follow the pointer, and stop the page scrolling.
  useEffect(() => {
    if (!active) return;

    const move = (e: PointerEvent) => {
      setPoint({ x: e.clientX, y: e.clientY });
      const col = columnAt(e.clientX, e.clientY);
      if (col !== overRef.current) {
        overRef.current = col;
        setOverColumnId(col);
      }
      const el = scrollRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        edge.current =
          e.clientX < r.left + EDGE ? -EDGE_SPEED :
          e.clientX > r.right - EDGE ? EDGE_SPEED : 0;
      }
    };

    const up = () => {
      const payload = activeRef.current;
      const col = overRef.current;
      if (payload && col && col !== payload.fromColumnId && canDropRef.current(col, payload)) {
        onDropRef.current(payload, col);
      }
      // Outlives the click that follows this pointerup.
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 120);
      stop();
    };

    const cancelTouch = (e: TouchEvent) => e.preventDefault();

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    // Non-passive: this is the listener that actually stops the scroll.
    document.addEventListener("touchmove", cancelTouch, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.removeEventListener("touchmove", cancelTouch);
    };
  }, [active, columnAt, scrollRef, stop]);

  // Pre-activation listeners: decide whether this press is a drag or a scroll.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = pending.current;
      if (!p || activeRef.current) return;
      const dx = Math.abs(e.clientX - p.x);
      const dy = Math.abs(e.clientY - p.y);
      if (p.touch) {
        // Moved before the hold completed — they are scrolling, not dragging.
        if (dx > TOUCH_SLOP || dy > TOUCH_SLOP) clearPending();
      } else if (dx > MOUSE_SLOP || dy > MOUSE_SLOP) {
        begin(p.payload, e.clientX, e.clientY);
      }
    };
    const up = () => { if (!activeRef.current) clearPending(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [begin, clearPending]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, payload: Omit<DragPayload, "width">) => {
      if (!enabled || e.button > 0) return;
      const width = (e.currentTarget as HTMLElement).getBoundingClientRect().width;
      const full: DragPayload = { ...payload, width };
      const touch = e.pointerType !== "mouse";
      const x = e.clientX, y = e.clientY;
      pending.current = {
        x, y, payload: full, touch,
        timer: touch
          ? window.setTimeout(() => { if (pending.current) begin(full, x, y); }, HOLD_MS)
          : null,
      };
    },
    [enabled, begin],
  );

  return {
    active,
    point,
    overColumnId,
    onPointerDown,
    /** True immediately after a drag, so the card's click does not open the sheet. */
    didDrag: () => suppressClick.current,
  };
}
