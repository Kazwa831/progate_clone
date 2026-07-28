"use client";

import { useState } from "react";
import type { JudgeResult } from "@/lib/judge/types";
import { InlineText } from "@/components/InlineText";
import { AlertIcon, CheckIcon, EyeIcon, PlayIcon, ResetIcon } from "@/components/icons";

type ResultCheckerProps = {
  onCheck: () => void;
  onReset: () => void;
  result: JudgeResult | null;
  hint?: string;
  commonMistakes?: string[];
  solutionCode: string;
  checkDisabled?: boolean;
};

export function ResultChecker({
  onCheck,
  onReset,
  result,
  hint,
  commonMistakes,
  solutionCode,
  checkDisabled = false,
}: ResultCheckerProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCheck}
          disabled={checkDisabled}
          className="interactive inline-flex items-center gap-2 rounded-lg bg-success px-5 py-2.5 text-sm font-medium text-success-foreground hover:bg-success-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlayIcon className="h-4 w-4" />
          実行して確認する
        </button>
        {checkDisabled && (
          <span className="type-caption text-ink-tertiary">
            実行環境を準備中です…
          </span>
        )}
        <button
          type="button"
          onClick={onReset}
          className="interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-tertiary hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ResetIcon className="h-3.5 w-3.5" />
          リセット
        </button>
        <button
          type="button"
          onClick={() => setShowAnswer((value) => !value)}
          className="interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-tertiary hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <EyeIcon className="h-3.5 w-3.5" />
          {showAnswer ? "答えを隠す" : "答えを見る"}
        </button>
      </div>

      {showAnswer && (
        <pre className="overflow-x-auto rounded-lg border border-hairline bg-surface-3 p-3 font-mono text-xs text-ink-muted">
          <code>{solutionCode}</code>
        </pre>
      )}

      {result && (
        <div
          className={`flex items-start gap-2 rounded-lg border-l-2 px-3 py-2.5 text-sm ${
            result.correct
              ? "border-success bg-success/10 text-success-text"
              : "border-destructive bg-destructive/10 text-destructive-text"
          }`}
        >
          {result.correct ? (
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            {result.correct ? "正解です！次のスライドに進みます。" : result.message}
          </span>
        </div>
      )}

      {result && !result.correct && (hint || (commonMistakes && commonMistakes.length > 0)) && (
        <div className="flex flex-col gap-2">
          {hint && (
            <p className="type-body-sm text-ink-subtle">
              <span className="font-medium text-ink-muted">ヒント:</span>{" "}
              <InlineText text={hint} />
            </p>
          )}
          {commonMistakes && commonMistakes.length > 0 && (
            <div className="rounded-lg border border-hairline bg-surface-3 px-4 py-3">
              <p className="type-eyebrow text-ink-tertiary">よくある間違い</p>
              <ul className="type-body-sm mt-2 list-disc space-y-1.5 pl-4 text-ink-subtle">
                {commonMistakes.map((mistake, index) => (
                  <li key={index}>
                    <InlineText text={mistake} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
