"use client";

import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

type LessonDrawerProps = {
  /** レッスン一覧。サーバーコンポーネントのまま受け取る */
  children: React.ReactNode;
};

/**
 * 狭い画面でレッスン一覧を開くためのドロワー。
 *
 * 画面が広いときはサイドバーが常に見えているので、この開閉ボタン自体を出さない。
 */
export function LessonDrawer({ children }: LessonDrawerProps) {
  const [open, setOpen] = useState(false);

  // 開いている間は背面をスクロールさせない
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="レッスン一覧を開く"
        className="interactive flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="レッスン一覧を閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-canvas shadow-xl">
            <div className="flex shrink-0 justify-end border-b border-hairline p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="レッスン一覧を閉じる"
                className="interactive flex h-11 w-11 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {/* レッスンを選ぶと画面が切り替わるため、ここで閉じる処理は要らない */}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
