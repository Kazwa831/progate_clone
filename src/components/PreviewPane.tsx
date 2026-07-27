import type { Ref } from "react";
import { buildJsRunnerHtml } from "@/lib/judge/javascriptJudge";
import { buildPythonRunnerHtml } from "@/lib/judge/pythonJudge";
import { buildSqlRunnerHtml } from "@/lib/judge/sqlJudge";

type PreviewPaneProps = {
  code: string;
  language: string;
  ref?: Ref<HTMLIFrameElement>;
};

// Python/SQLは読み込みにある程度時間がかかるため、コード変更のたびにiframeを
// 再読み込みしない。srcDocはレッスン表示中ずっと同じ内容にし、常駐した実行環境に対して
// postMessageで実行コードを送る方式にする（build*RunnerHtml()はcodeを受け取らない）。
const PERSISTENT_RUNNER_LANGUAGES = new Set(["python", "sql"]);

function srcDocFor(language: string, code: string): string {
  if (language === "javascript") return buildJsRunnerHtml(code);
  if (language === "python") return buildPythonRunnerHtml();
  if (language === "sql") return buildSqlRunnerHtml();
  return code;
}

export function PreviewPane({ code, language, ref }: PreviewPaneProps) {
  // HTML/CSSコースはDOM検証のためallow-same-originが必要。
  // JavaScript/Python/SQLコースはpostMessageで結果をやり取りするためallow-scriptsのみとし、
  // allow-scripts + allow-same-originの組み合わせ（サンドボックス回避のリスクがある）を避ける。
  const sandbox =
    language === "javascript" || PERSISTENT_RUNNER_LANGUAGES.has(language)
      ? "allow-scripts"
      : "allow-same-origin";

  return (
    <iframe
      ref={ref}
      title="実行結果プレビュー"
      srcDoc={srcDocFor(language, code)}
      sandbox={sandbox}
      className="h-full w-full border-0 bg-white"
    />
  );
}
