import type { JudgeResult } from "./types";

// Pyodideの読み込みが完了したことを知らせるpostMessageの目印
export const PYTHON_READY_MESSAGE_TYPE = "progate-clone-python-ready";
// 親からiframeへ「このコードを実行して」と伝えるpostMessageの目印
export const PYTHON_RUN_MESSAGE_TYPE = "progate-clone-python-run";
// iframeから親へ実行結果を伝えるpostMessageの目印
export const PYTHON_RESULT_MESSAGE_TYPE = "progate-clone-python-result";

const PYODIDE_VERSION = "314.0.3";
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export type PyRunResult = {
  logs: string[];
  variables: Record<string, unknown>;
  error: string | null;
};

// Pyodideの初回読み込みには数秒かかるため、HTML/CSS・JSコースのように
// コード変更のたびにiframeを再読み込みする方式は取れない。
// このHTML自体は不変（srcDocは固定）にしておき、レッスンを開いたときに1度だけ
// Pyodideをロードし、以後は親からのRUNメッセージを受けるたびに実行する
// 常駐ランナーとして動作する。allow-same-originを持たないため、結果は
// postMessageでのみやり取りする（HTML/CSS用のjudgeと同じ考え方）。
export function buildPythonRunnerHtml(): string {
  return `<!DOCTYPE html>
<html>
<body>
<pre id="output" style="margin:0;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;">Pythonの実行環境を読み込み中...</pre>
<script src="${PYODIDE_CDN_BASE}pyodide.js"></script>
<script>
(async function () {
  var outputEl = document.getElementById("output");

  function report(type, data) {
    parent.postMessage(Object.assign({ type: type }, data || {}), "*");
  }

  var pyodide;
  try {
    pyodide = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_CDN_BASE)} });
  } catch (e) {
    outputEl.textContent = "Pythonの実行環境の読み込みに失敗しました。インターネット接続を確認してください。";
    report(${JSON.stringify(PYTHON_RESULT_MESSAGE_TYPE)}, {
      error: e && e.message ? e.message : String(e),
    });
    return;
  }

  outputEl.textContent = "準備ができました。「実行して確認する」を押してください。";

  // このiframeはページのSSR済みHTMLに直接埋め込まれているため、Reactが
  // hydrationを終えてmessageリスナーを登録するより先にPyodideの読み込みが
  // 完了してしまうことがある。1回きりの通知だと親が間に合わず取りこぼす
  // 可能性があるため、短い間隔で数回だけ繰り返し送る（親側の処理は
  // 何度届いても同じ状態にするだけなので副作用はない）。
  var readyNoticeCount = 0;
  var readyNoticeTimer = setInterval(function () {
    report(${JSON.stringify(PYTHON_READY_MESSAGE_TYPE)});
    readyNoticeCount++;
    if (readyNoticeCount >= 20) clearInterval(readyNoticeTimer);
  }, 250);

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== ${JSON.stringify(PYTHON_RUN_MESSAGE_TYPE)}) return;

    var logs = [];
    pyodide.setStdout({
      batched: function (msg) {
        logs.push(msg);
      },
    });

    // 実行のたびに空のグローバル領域を用意し、前回までの変数が
    // 残ったまま次の判定に影響しないようにする
    var namespace = pyodide.toPy({});
    var variables = {};
    var error = null;

    try {
      pyodide.runPython(event.data.code, { globals: namespace });
      // namespace.keys()はイテレータを返す（配列ではない）ため、
      // for-ofで走査する（indexアクセスやlengthは使えない）
      for (var key of namespace.keys()) {
        if (typeof key !== "string" || key.indexOf("__") === 0) continue;
        var value = namespace.get(key);
        if (
          typeof value === "number" ||
          typeof value === "string" ||
          typeof value === "boolean"
        ) {
          variables[key] = value;
        }
      }
    } catch (e) {
      error = e && e.message ? e.message : String(e);
    }
    namespace.destroy();

    outputEl.textContent = error
      ? logs.join("\\n") + "\\nエラー: " + error
      : logs.join("\\n") || "(出力なし)";

    report(${JSON.stringify(PYTHON_RESULT_MESSAGE_TYPE)}, {
      logs: logs,
      variables: variables,
      error: error,
    });
  });
})();
</script>
</body>
</html>`;
}

export function judgePythonOutput(
  result: PyRunResult | null,
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
    case "python-output-equals": {
      const expected = checkRule.expectedOutput as string;
      if (result.logs.includes(expected)) {
        return { correct: true };
      }
      return {
        correct: false,
        message: `出力結果が「${expected}」になっていません`,
      };
    }
    case "python-variable-equals": {
      const variable = checkRule.variable as string;
      const expected = checkRule.expectedValue;
      const actual = result.variables[variable];
      if (actual === undefined) {
        return { correct: false, message: `変数「${variable}」が定義されていません` };
      }
      if (actual === expected) {
        return { correct: true };
      }
      return {
        correct: false,
        message: `変数「${variable}」の値が期待値と異なります`,
      };
    }
    default:
      return { correct: false, message: "未対応の判定タイプです" };
  }
}
