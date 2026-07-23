import type { JudgeResult } from "@/lib/judge/types";

type ResultCheckerProps = {
  onCheck: () => void;
  result: JudgeResult | null;
  hint?: string;
};

export function ResultChecker({ onCheck, result, hint }: ResultCheckerProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onCheck}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        実行して確認する
      </button>

      {result && (
        <p
          className={`mt-2 text-sm ${
            result.correct ? "text-green-700" : "text-red-600"
          }`}
        >
          {result.correct ? "正解です！次のスライドに進みます。" : result.message}
        </p>
      )}

      {result && !result.correct && hint && (
        <p className="mt-1 text-sm text-gray-500">ヒント: {hint}</p>
      )}
    </div>
  );
}
