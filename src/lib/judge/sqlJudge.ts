import type { JudgeResult } from "./types";

// sql.jsの読み込み完了通知のpostMessageの目印
export const SQL_READY_MESSAGE_TYPE = "progate-clone-sql-ready";
// 親からiframeへ「このSQLを実行して」と伝えるpostMessageの目印
export const SQL_RUN_MESSAGE_TYPE = "progate-clone-sql-run";
// iframeから親へ実行結果を伝えるpostMessageの目印
export const SQL_RESULT_MESSAGE_TYPE = "progate-clone-sql-result";

const SQLJS_VERSION = "1.14.1";
const SQLJS_CDN_BASE = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`;

// コース全体で共通のサンプルデータベース。usersとposts(投稿)の2テーブルで、
// 単純なSELECTからJOINまで一貫したデータを使って学べるようにする。
export const SQL_SAMPLE_SCHEMA = `
CREATE TABLE users (id INTEGER, name TEXT, age INTEGER, city TEXT);
INSERT INTO users (id, name, age, city) VALUES
  (1, 'Alice', 25, 'Tokyo'),
  (2, 'Bob', 30, 'Osaka'),
  (3, 'Carol', 22, 'Tokyo'),
  (4, 'Dave', 35, 'Nagoya'),
  (5, 'Eve', 28, 'Osaka');

CREATE TABLE posts (id INTEGER, user_id INTEGER, title TEXT, likes INTEGER);
INSERT INTO posts (id, user_id, title, likes) VALUES
  (1, 1, 'Hello World', 10),
  (2, 1, 'My Second Post', 5),
  (3, 2, 'Osaka Life', 20),
  (4, 3, 'Tokyo Diaries', 8),
  (5, 4, 'Nagoya Castle', 15);
`.trim();

export type SqlRunResult = {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  error: string | null;
};

// Pythonコースと同じ考え方の常駐ランナー。sql.jsの読み込みは軽い（数百ms程度）が、
// 一貫性のため同じ「1回だけ読み込み、以後はpostMessageでSQLを受け取って実行する」
// 方式にする。実行のたびに新しいDatabaseを作り直すことで、
// ユーザーが誤ってUPDATE/DELETEを書いても次の実行に影響しないようにしている。
export function buildSqlRunnerHtml(): string {
  return `<!DOCTYPE html>
<html>
<body>
<div id="output" style="padding:12px;font-family:monospace;font-size:13px;">sql.jsを読み込み中...</div>
<script src="${SQLJS_CDN_BASE}sql-wasm.js"></script>
<script>
(async function () {
  var outputEl = document.getElementById("output");

  function report(type, data) {
    parent.postMessage(Object.assign({ type: type }, data || {}), "*");
  }

  function renderTable(columns, rows) {
    if (columns.length === 0) {
      outputEl.textContent = "(結果は0件でした)";
      return;
    }
    var html = "<table style='border-collapse:collapse;font-size:13px;'>";
    html += "<tr>" + columns.map(function (c) {
      return "<th style='border:1px solid #ccc;padding:4px 8px;text-align:left;'>" + c + "</th>";
    }).join("") + "</tr>";
    rows.forEach(function (row) {
      html += "<tr>" + row.map(function (v) {
        return "<td style='border:1px solid #ccc;padding:4px 8px;'>" + (v === null ? "NULL" : v) + "</td>";
      }).join("") + "</tr>";
    });
    html += "</table>";
    outputEl.innerHTML = html;
  }

  var SQL;
  try {
    SQL = await initSqlJs({
      locateFile: function (file) {
        return ${JSON.stringify(SQLJS_CDN_BASE)} + file;
      },
    });
  } catch (e) {
    outputEl.textContent = "sql.jsの読み込みに失敗しました。インターネット接続を確認してください。";
    report(${JSON.stringify(SQL_RESULT_MESSAGE_TYPE)}, {
      error: e && e.message ? e.message : String(e),
    });
    return;
  }

  outputEl.textContent = "準備ができました。「実行して確認する」を押してください。";

  // このiframeはページのSSR済みHTMLに直接埋め込まれているため、Reactが
  // hydrationを終えてmessageリスナーを登録するより先に読み込みが完了してしまうことがある。
  // 1回きりの通知だと取りこぼす恐れがあるため、短い間隔で数回だけ繰り返し送る。
  var readyNoticeCount = 0;
  var readyNoticeTimer = setInterval(function () {
    report(${JSON.stringify(SQL_READY_MESSAGE_TYPE)});
    readyNoticeCount++;
    if (readyNoticeCount >= 20) clearInterval(readyNoticeTimer);
  }, 250);

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== ${JSON.stringify(SQL_RUN_MESSAGE_TYPE)}) return;

    var db = new SQL.Database();
    var columns = [];
    var rows = [];
    var error = null;

    try {
      db.run(${JSON.stringify(SQL_SAMPLE_SCHEMA)});
      var result = db.exec(event.data.code);
      if (result.length > 0) {
        columns = result[0].columns;
        rows = result[0].values;
      }
      renderTable(columns, rows);
    } catch (e) {
      error = e && e.message ? e.message : String(e);
      outputEl.textContent = "エラー: " + error;
    }
    db.close();

    report(${JSON.stringify(SQL_RESULT_MESSAGE_TYPE)}, {
      columns: columns,
      rows: rows,
      error: error,
    });
  });
})();
</script>
</body>
</html>`;
}

export function judgeSqlResult(
  result: SqlRunResult | null,
  checkType: string,
  checkRule: Record<string, unknown>
): JudgeResult {
  if (!result) {
    return { correct: false, message: "まだクエリが実行されていません" };
  }

  if (result.error) {
    return { correct: false, message: `SQLエラー: ${result.error}` };
  }

  switch (checkType) {
    case "sql-result-equals": {
      const expectedColumns = checkRule.columns as string[];
      const expectedRows = checkRule.rows as Array<Array<string | number | null>>;

      const columnsMatch =
        JSON.stringify(result.columns) === JSON.stringify(expectedColumns);
      const rowsMatch = JSON.stringify(result.rows) === JSON.stringify(expectedRows);

      if (columnsMatch && rowsMatch) {
        return { correct: true };
      }
      return {
        correct: false,
        message: "実行結果が期待したものと異なります",
      };
    }
    default:
      return { correct: false, message: "未対応の判定タイプです" };
  }
}
