import type { Ref } from "react";
import { buildJsRunnerHtml } from "@/lib/judge/javascriptJudge";
import { buildPythonRunnerHtml } from "@/lib/judge/pythonJudge";

type PreviewPaneProps = {
  code: string;
  language: string;
  ref?: Ref<HTMLIFrameElement>;
};

function srcDocFor(language: string, code: string): string {
  if (language === "javascript") return buildJsRunnerHtml(code);
  // Pythonは初回ロードに数秒かかるため、コード変更のたびにiframeを再読み込みしない。
  // srcDocはレッスン表示中ずっと同じ内容にし、常駐したPyodideに対して
  // postMessageで実行コードを送る方式にする（buildPythonRunnerHtml()はcodeを受け取らない）。
  if (language === "python") return buildPythonRunnerHtml();
  return code;
}

export function PreviewPane({ code, language, ref }: PreviewPaneProps) {
  // HTML/CSSコースはDOM検証のためallow-same-originが必要。
  // JavaScript/Pythonコースはpostmessageで結果をやり取りするためallow-scriptsのみとし、
  // allow-scripts + allow-same-originの組み合わせ（サンドボックス回避のリスクがある）を避ける。
  const sandbox =
    language === "javascript" || language === "python"
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
