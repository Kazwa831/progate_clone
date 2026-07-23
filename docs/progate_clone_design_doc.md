# 自作プログラミング学習アプリ 設計書
## 「Progate風・個人用コーディング学習プラットフォーム」

作成日: 2026-07-24
対象: Claude Code による実装用設計書
用途: 就職活動のための個人学習（自分専用、単一ユーザー想定）

---

## 1. 目的・コンセプト

- Progateの無料枠だけでは学習量が足りないため、自分専用の代替学習ツールを作る。
- Progateと同じ「スライド解説 → コード入力 → 実行結果確認 → 正誤判定 → 次のレッスンへ」という
  学習体験を再現する。
- 第1弾は **HTML/CSS基礎コース** を完成させる。
- 将来的に **JavaScript／Python／SQL** など多言語コースへ拡張できるように、
  「コース・レッスン・問題」をデータ（JSON）として追加するだけで新コースを増やせる設計にする。
- 単一ユーザーのローカル運用を前提とし、認証機能は作らない（学習履歴・進捗はDBに保存）。

---

## 2. 技術スタック

就職活動でのアピールも意識し、実務でよく使われるモダン構成を採用する。

| 分類 | 採用技術 | 理由 |
|---|---|---|
| フレームワーク | **Next.js (App Router) + TypeScript** | フロント/API(Route Handlers)を1つのプロジェクトで完結でき、実務でも頻出。ローカル起動が容易 |
| スタイリング | **Tailwind CSS** | 実装速度と見た目の整いやすさ。就活ポートフォリオ的にも一般的 |
| DB | **SQLite**（ファイル1つ: `data/app.db`） | ローカル運用に最適、セットアップ不要 |
| ORM | **Prisma** | SQLiteとの相性が良く、スキーマ管理・マイグレーションが容易。TypeScriptとの親和性も高い |
| コード実行環境（HTML/CSS） | **iframe + srcdoc** によるサンドボックス実行 | ブラウザ内で完結、サーバー不要、安全 |
| コード実行環境（JS、将来） | iframe内で `<script>` を実行しconsole出力をpostMessageで受信 | 同上の仕組みを流用可能 |
| コード実行環境（Python、将来） | **Pyodide**（WebAssembly版Python、ブラウザ内実行） | サーバーにコードを送らず安全に実行可能。追加コースとして後付け可能 |
| エディタ | **CodeMirror 6** | 軽量でカスタマイズしやすく、シンタックスハイライト対応 |
| パッケージ管理 | npm | Claude Codeでの実装のしやすさ重視 |

> 実行環境について: HTML/CSSはiframeで完全に本格的な実行が可能。JS/Pythonへ拡張する際も
> 「ブラウザ内サンドボックス実行」という同じ設計思想を維持できるため、後方互換性が高い。

---

## 3. ディレクトリ構成（想定）

```
progate-clone/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── data/
│   └── app.db                      # SQLite本体
├── content/                        # コース内容(JSON)。ここを増やすだけでコース追加可能
│   ├── html-css/
│   │   ├── course.json             # コースメタ情報（タイトル、説明、章立て）
│   │   └── lessons/
│   │       ├── 01-html-basic.json
│   │       ├── 02-html-tags.json
│   │       └── ...
│   ├── javascript/                 # 将来追加
│   └── python/                     # 将来追加
├── src/
│   ├── app/
│   │   ├── page.tsx                # コース一覧トップページ
│   │   ├── courses/[courseId]/page.tsx        # コース詳細(章・レッスン一覧)
│   │   ├── courses/[courseId]/lessons/[lessonId]/page.tsx  # 学習画面
│   │   ├── api/
│   │   │   ├── progress/route.ts   # 進捗の取得・更新
│   │   │   └── courses/route.ts    # コース一覧取得(JSON読み込み)
│   ├── components/
│   │   ├── SlidePanel.tsx          # 左側: スライド解説
│   │   ├── CodeEditor.tsx          # 右上: コードエディタ(CodeMirror)
│   │   ├── PreviewPane.tsx         # 右下: 実行結果(iframe)
│   │   ├── ResultChecker.tsx       # 正誤判定・フィードバック表示
│   │   ├── ProgressBar.tsx         # 学習進捗バー
│   │   └── CourseCard.tsx          # コース一覧のカード
│   ├── lib/
│   │   ├── prisma.ts               # Prismaクライアント
│   │   ├── contentLoader.ts        # content/配下のJSONを読み込むユーティリティ
│   │   └── judge/
│   │       ├── htmlCssJudge.ts     # HTML/CSS用の正誤判定ロジック
│   │       └── types.ts
│   └── types/
│       └── lesson.ts               # レッスン・問題の型定義
├── package.json
└── README.md
```

---

## 4. コース・レッスンのデータ設計（拡張性の核）

### 4.1 設計方針
新しい言語コースを追加する際、**コードを書き足す必要がなく `content/` にJSONを追加するだけ**
で済むようにする。判定ロジックだけは言語ごとに `judge/` 配下に実装を分ける
（例: `htmlCssJudge.ts`, 将来 `javascriptJudge.ts` など）。

### 4.2 コースメタ情報 `content/html-css/course.json`
```json
{
  "id": "html-css",
  "title": "HTML/CSS基礎コース",
  "description": "Webページの基本構造とスタイリングを学びます",
  "language": "html-css",
  "chapters": [
    {
      "id": "chapter-1",
      "title": "第1章: HTMLの基本",
      "lessonIds": ["01-html-basic", "02-html-tags"]
    },
    {
      "id": "chapter-2",
      "title": "第2章: CSSで装飾する",
      "lessonIds": ["03-css-basic"]
    }
  ]
}
```

### 4.3 レッスン内容 `content/html-css/lessons/01-html-basic.json`
Progateの「スライド → 問題」の流れを1レッスン内に複数スライドとして持たせる。

```json
{
  "id": "01-html-basic",
  "title": "HTMLとは",
  "slides": [
    {
      "type": "explanation",
      "body": "HTMLはWebページの構造を作るための言語です。\n<h1>タグは見出しを表します。"
    },
    {
      "type": "exercise",
      "instruction": "見出し「Hello World」を表示する<h1>タグを書いてみましょう。",
      "starterCode": "<!-- ここにコードを書いてください -->\n",
      "solutionCode": "<h1>Hello World</h1>",
      "checkType": "contains-tag",
      "checkRule": {
        "tag": "h1",
        "textContent": "Hello World"
      },
      "hint": "<h1>タグで文字を囲みましょう"
    }
  ]
}
```

- `checkType` によって判定方法を切り替える（例: `contains-tag`, `css-property`,
  `regex-match`, `js-output-equals` など）。
- 判定ロジックは `lib/judge/htmlCssJudge.ts` に集約し、`checkType` に応じて
  分岐する設計にする（Strategyパターン）。

### 4.4 型定義（例） `src/types/lesson.ts`
```typescript
export type SlideExplanation = {
  type: "explanation";
  body: string;
};

export type SlideExercise = {
  type: "exercise";
  instruction: string;
  starterCode: string;
  solutionCode: string;
  checkType: "contains-tag" | "css-property" | "regex-match";
  checkRule: Record<string, unknown>;
  hint?: string;
};

export type Slide = SlideExplanation | SlideExercise;

export type Lesson = {
  id: string;
  title: string;
  slides: Slide[];
};

export type Chapter = {
  id: string;
  title: string;
  lessonIds: string[];
};

export type Course = {
  id: string;
  title: string;
  description: string;
  language: string;
  chapters: Chapter[];
};
```

---

## 5. DB設計（進捗管理用）

単一ユーザー前提なので `User` テーブルは持たず、進捗だけを保存する最小構成にする。

### 5.1 `prisma/schema.prisma`
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:../data/app.db"
}

generator client {
  provider = "prisma-client-js"
}

model LessonProgress {
  id            Int      @id @default(autoincrement())
  courseId      String
  lessonId      String
  status        String   @default("not_started") // not_started | in_progress | completed
  currentSlide  Int      @default(0)
  completedAt   DateTime?
  updatedAt     DateTime @updatedAt

  @@unique([courseId, lessonId])
}

model CourseProgress {
  id           Int      @id @default(autoincrement())
  courseId     String   @unique
  totalLessons Int
  completedLessons Int  @default(0)
  updatedAt    DateTime @updatedAt
}
```

- 学習の再開位置（`currentSlide`）まで保存することで、Progateのように
  「途中から再開」できるようにする。
- コース単位の進捗（何%完了したか）は `CourseProgress` で集計して持つ
  （都度計算でも良いが、一覧画面表示のパフォーマンスのためキャッシュ的に保持）。

---

## 6. 画面設計

### 6.1 トップページ（コース一覧） `/`
- コースカードを一覧表示（HTML/CSS、将来はJS/Pythonも並ぶ）
- 各カードに進捗バー（例: 3/10レッスン完了）
- 「続きから」ボタンで最後に学習していたレッスンへ遷移

### 6.2 コース詳細ページ `/courses/[courseId]`
- 章立て（アコーディオン）とレッスン一覧
- 完了レッスンにはチェックマーク
- 未着手/学習中/完了のステータス表示

### 6.3 学習画面（メイン） `/courses/[courseId]/lessons/[lessonId]`
Progate同様、**3ペイン構成**にする。

```
+----------------------+----------------------------+
|                      |   コードエディタ            |
|   スライド解説        |   (CodeMirror)              |
|   / 問題文            +----------------------------+
|                      |   実行結果プレビュー(iframe)|
|  [前へ] [次へ]        |   [実行して確認する] ボタン  |
+----------------------+----------------------------+
```

- 左ペイン: 解説スライド or 問題文。スライド送り(前へ/次へ)。
- 右上ペイン: コードエディタ。`starterCode` を初期表示。
- 右下ペイン: 実行結果。HTML/CSSの場合は書いたコードを `iframe srcdoc` に
  流し込みリアルタイム(または「実行」ボタン押下時)にプレビュー。
- 「実行して確認する」ボタン押下時に `judge` ロジックで正誤判定し、
  正解なら次のスライドへ進めるようにする。不正解ならヒント表示。
- レッスン完了時に進捗APIへPOSTし、DBを更新。

---

## 7. コード実行・判定の仕組み（重要ポイント）

### 7.1 HTML/CSSの実行
- ユーザーが書いたHTML(+CSSを`<style>`として埋め込み)を
  `<iframe srcdoc={userCode} />` に渡すだけで安全にレンダリングできる。
- サーバーサイドでコードを実行する必要はなく、**全てブラウザ内で完結**するため
  セキュリティリスクが低い。

### 7.2 正誤判定ロジック
- iframe内のDOMを `iframe.contentDocument` 経由で取得し、
  `checkRule` に基づいて検証する。
  - 例: `contains-tag` → `querySelector('h1')` の有無とテキスト内容を確認
  - 例: `css-property` → `getComputedStyle(el).color` などを確認
- 判定関数は `checkType` ごとに関数を用意し、`judge/htmlCssJudge.ts` で
  ディスパッチする（新しい判定パターンが必要になったら関数を追加するだけ）。

```typescript
// lib/judge/htmlCssJudge.ts (イメージ)
export function judgeExercise(
  iframeDoc: Document,
  checkType: string,
  checkRule: Record<string, unknown>
): { correct: boolean; message?: string } {
  switch (checkType) {
    case "contains-tag":
      return checkContainsTag(iframeDoc, checkRule);
    case "css-property":
      return checkCssProperty(iframeDoc, checkRule);
    default:
      return { correct: false, message: "未対応の判定タイプです" };
  }
}
```

### 7.3 将来のJavaScript/Python拡張時の判定方針（設計メモ）
- JS: iframe内でコードを実行し、`console.log`をフックしてpostMessageで
  結果を親ウィンドウに送信 → 期待する出力と一致するか判定。
- Python: Pyodideをブラウザにロードし、`pyodide.runPython(code)` の
  戻り値・標準出力をキャプチャして判定。
- どちらも「ブラウザ内サンドボックス実行 → 出力を判定」という
  HTML/CSSと同じ設計パターンを踏襲できる。

---

## 8. API設計

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/api/courses` | `content/`配下の全コース一覧をJSONで返す |
| GET | `/api/courses/[courseId]` | 特定コースの章・レッスン一覧を返す |
| GET | `/api/courses/[courseId]/lessons/[lessonId]` | レッスン内容(スライド・問題)を返す |
| GET | `/api/progress` | 全コースの進捗一覧を返す（トップページ用） |
| POST | `/api/progress` | レッスン進捗を更新（スライド位置・完了状態） |

---

## 9. 開発ステップ（Claude Codeへの実装依頼順）

段階的に依頼することで、都度動作確認しながら進められるようにする。

1. **プロジェクト初期セットアップ**
   Next.js + TypeScript + Tailwind + Prisma(SQLite) のプロジェクト作成、
   最小限の疎通確認（トップページ表示まで）
2. **コンテンツ読み込み基盤**
   `content/html-css/` のJSON構造を決めて、2〜3レッスン分サンプルデータを作成。
   `contentLoader.ts` でJSONを読み込みAPIとして返せるようにする。
3. **コース一覧・コース詳細画面**
   `/` と `/courses/[courseId]` を実装。進捗DBはこの時点でダミーでもOK。
4. **学習画面（3ペイン）の実装**
   スライド表示、CodeMirrorエディタ、iframeプレビューの土台を作る。
5. **正誤判定ロジック実装**
   `contains-tag` など基本的な判定パターンから実装し、動作確認。
6. **進捗保存機能の実装**
   Prismaスキーマ確定、`/api/progress` の実装、学習画面からの進捗更新。
7. **HTML/CSSコースの中身を拡充**
   実際に就活で必要な範囲までレッスン数を増やす。
8. **（将来）JavaScriptコース追加**
   `content/javascript/` を追加し、`judge`にJS用ロジックを追加するだけで
   拡張できることを確認する。

---

## 10. 今回のスコープ（MVP）と将来の拡張の切り分け

| 今回作る(MVP) | 将来拡張（設計だけ考慮） |
|---|---|
| HTML/CSSコース一式 | JavaScriptコース |
| iframeでのHTML/CSS実行・判定 | Pyodideを使ったPython実行 |
| SQLiteでの進捗保存 | SQLコース（DB操作の学習） |
| 単一ユーザー・認証なし | 必要になれば認証機能を後付け |

---

## 11. 未確定・今後Claude Codeとの実装時に詰めるべき点（メモ）

- CSSの判定について、`getComputedStyle`で厳密に見るか、
  書いたコードの文字列パターンで緩く見るか（初学者には後者の方が優しい場合あり）
  → 学習フェーズが進むごとに厳密さを上げる方針で良いか要検討。
- ヒント表示のタイミング（不正解1回目から出すか、2回目以降にするか）
- レッスン数・粒度（Progateの1レッスンあたりの問題数を参考にするか、
  もっと細かく刻むか）
- ダークモード対応の要否（就活ポートフォリオとして見せる場合は見た目も重要）

---

以上が設計書です。この内容をベースにClaude Codeへ実装を依頼してください。
