import type { JudgeResult } from "./types";

// iframe内で実行した結果を親ウィンドウへ知らせる際のpostMessageの目印
export const JS_RESULT_MESSAGE_TYPE = "progate-clone-js-result";

export type JsRunResult = {
  logs: string[];
  error: string | null;
};

// ユーザーが書いたJSコードを、console.logをフックして実行結果をpostMessageで
// 親ウィンドウに送るHTMLでラップする。iframeのsandboxは"allow-scripts"のみを
// 想定しており(allow-same-originは付与しない)、親からcontentDocumentへ直接
// アクセスすることはできないため、結果の受け渡しはpostMessageに統一する。
export function buildJsRunnerHtml(userCode: string): string {
  const encodedCode = JSON.stringify(userCode);

  return `<!DOCTYPE html>
<html>
<body>
<pre id="output" style="margin:0;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;"></pre>
<script>
(function () {
  var logs = [];
  var originalLog = console.log;
  console.log = function () {
    var args = Array.prototype.slice.call(arguments);
    logs.push(args.map(String).join(" "));
    originalLog.apply(console, args);
    document.getElementById("output").textContent = logs.join("\\n");
  };

  function report(error) {
    parent.postMessage({ type: ${JSON.stringify(JS_RESULT_MESSAGE_TYPE)}, logs: logs, error: error }, "*");
  }

  try {
    (0, eval)(${encodedCode});
    report(null);
  } catch (e) {
    document.getElementById("output").textContent =
      logs.join("\\n") + "\\nエラー: " + (e && e.message ? e.message : String(e));
    report(e && e.message ? e.message : String(e));
  }
})();
</script>
</body>
</html>`;
}

export function judgeJavaScriptOutput(
  result: JsRunResult | null,
  checkType: string,
  checkRule: Record<string, unknown>
): JudgeResult {
  if (!result) {
    return { correct: false, message: "まだコードが実行されていません" };
  }

  if (result.error) {
    return { correct: false, message: `実行時エラー: ${result.error}` };
  }

  switch (checkType) {
    case "js-output-equals": {
      const expected = checkRule.expectedOutput as string;
      if (result.logs.includes(expected)) {
        return { correct: true };
      }
      return {
        correct: false,
        message: `出力結果が「${expected}」になっていません`,
      };
    }
    default:
      return { correct: false, message: "未対応の判定タイプです" };
  }
}
