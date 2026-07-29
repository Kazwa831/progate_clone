"use client";

import { PlayIcon } from "@/components/icons";

type LessonActionBarProps = {
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  nextDisabled: boolean;
  /** 演習スライドのときだけ渡す。押すと判定して結果タブへ移る */
  onCheck?: () => void;
  checkDisabled?: boolean;
};

/**
 * 狭い画面用の操作バー。画面下部に固定する。
 *
 * 以前は「次へ」がスライドの末尾にあり、画面外に出て押せなかった。
 * どのタブを見ていても操作できるよう、ここにまとめている。
 */
export function LessonActionBar({
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  nextDisabled,
  onCheck,
  checkDisabled,
}: LessonActionBarProps) {
  return (
    <div className="shrink-0 border-t border-hairline bg-surface-1 px-3 py-2.5 md:hidden">
      {onCheck && (
        <button
          type="button"
          onClick={onCheck}
          disabled={checkDisabled}
          className="interactive mb-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-success px-5 text-sm font-medium text-success-foreground hover:bg-success-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlayIcon className="h-4 w-4" />
          実行して確認する
        </button>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="interactive type-body-sm min-h-11 flex-1 rounded-lg border border-hairline px-3 font-medium text-ink-subtle hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {prevLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="interactive type-body-sm min-h-11 flex-1 rounded-lg bg-accent px-3 font-medium text-accent-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
