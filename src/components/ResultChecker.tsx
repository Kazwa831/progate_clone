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
};

export function ResultChecker({
  onCheck,
  onReset,
  result,
  hint,
  commonMistakes,
  solutionCode,
}: ResultCheckerProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCheck}
          className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-colors hover:bg-success-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PlayIcon className="h-4 w-4" />
          実行して確認する
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ResetIcon className="h-3.5 w-3.5" />
          リセット
        </button>
        <button
          type="button"
          onClick={() => setShowAnswer((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <EyeIcon className="h-3.5 w-3.5" />
          {showAnswer ? "答えを隠す" : "答えを見る"}
        </button>
      </div>

      {showAnswer && (
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <code>{solutionCode}</code>
        </pre>
      )}

      {result && (
        <div
          className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
            result.correct
              ? "bg-success/10 text-success-text"
              : "bg-destructive/10 text-destructive-text"
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
            <p className="text-sm text-muted-foreground">
              ヒント: <InlineText text={hint} />
            </p>
          )}
          {commonMistakes && commonMistakes.length > 0 && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                よくある間違い
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
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
