import type { JudgeResult } from "@/lib/judge/types";
import { AlertIcon, CheckIcon, PlayIcon } from "@/components/icons";

type ResultCheckerProps = {
  onCheck: () => void;
  result: JudgeResult | null;
  hint?: string;
};

export function ResultChecker({ onCheck, result, hint }: ResultCheckerProps) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onCheck}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-colors hover:bg-success-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <PlayIcon className="h-4 w-4" />
        実行して確認する
      </button>

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

      {result && !result.correct && hint && (
        <p className="text-sm text-muted-foreground">ヒント: {hint}</p>
      )}
    </div>
  );
}
