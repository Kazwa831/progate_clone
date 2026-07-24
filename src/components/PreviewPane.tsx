import type { Ref } from "react";
import { buildJsRunnerHtml } from "@/lib/judge/javascriptJudge";

type PreviewPaneProps = {
  code: string;
  language: string;
  ref?: Ref<HTMLIFrameElement>;
};

export function PreviewPane({ code, language, ref }: PreviewPaneProps) {
  const isJavaScript = language === "javascript";

  return (
    <iframe
      ref={ref}
      title="実行結果プレビュー"
      srcDoc={isJavaScript ? buildJsRunnerHtml(code) : code}
      // HTML/CSSコースはDOM検証のためallow-same-originが必要。
      // JavaScriptコースはpostMessageで結果をやり取りするためallow-scriptsのみとし、
      // allow-scripts + allow-same-originの組み合わせ（サンドボックス回避のリスクがある）を避ける。
      sandbox={isJavaScript ? "allow-scripts" : "allow-same-origin"}
      className="h-full w-full border-0 bg-white"
    />
  );
}
