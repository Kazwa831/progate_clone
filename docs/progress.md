# 開発進捗ログ

このファイルは作業の区切りごとに更新する。`docs/progate_clone_design_doc.md` を唯一の仕様書とする。

---

## プロジェクト概要・開発計画

Progate風の自作プログラミング学習プラットフォーム。第1弾はHTML/CSS基礎コースを完成させ、
将来的にJavaScript/Python/SQLコースへ`content/`配下のJSON追加のみで拡張できる設計とする。
単一ユーザー・ローカル運用前提で認証機能は作らない。就活ポートフォリオとして、
保守性・可読性・拡張性を重視し、モダンかつ安定した技術構成で実装する。

## 技術スタック（決定事項）

| 分類 | 技術 | バージョン | 備考 |
|---|---|---|---|
| フレームワーク | Next.js (App Router) + TypeScript | 15.5.21 | 安定重視で15系を採用。16系はasync params等の破壊的変更とPrisma7組み合わせの既知不具合があるため見送り |
| スタイリング | Tailwind CSS | v4 (^4) | CSS-first設定（`tailwind.config.js`なし、`@theme`をglobals.cssで管理） |
| DB | SQLite | — | `data/app.db`単一ファイル |
| ORM | Prisma | 6.19.3 | generatorは新形式`prisma-client`、engine: classic |
| コード実行(HTML/CSS) | iframe + srcdoc | — | ブラウザ内完結でセキュア |
| コード実行(将来JS) | iframe + postMessage | — | 同じサンドボックス方針を踏襲 |
| コード実行(将来Python) | Pyodide | — | WebAssembly版Python |
| エディタ | CodeMirror 6 | 未導入（ステップ4で導入予定） | |
| パッケージ管理 | npm | 11.16.0 | |
| Node.js | — | v24.18.0 | |

### バージョン選定の経緯（設計書からの変更点）
設計書執筆時点から状況が変わっていたため、ユーザーに確認の上で以下を決定：
- **Next.js**: 最新は16系だが、`params`/`searchParams`の完全async化・`middleware.ts`→`proxy.ts`
  リネームなどの破壊的変更に加え、Next16(Turbopack)+Prisma7の組み合わせに既知の不具合報告が
  あるため、15系最新（15.5.21）を採用（ユーザーが安定重視を選択）。
- **Prisma**: 最新7系は`prisma-client-js`が非推奨となりドライバアダプター必須の新アーキテクチャに
  移行するため、実績のある6系最新（6.19.3）を採用。ただし6.19時点でも`prisma init`のデフォルトが
  既に新generator `prisma-client`（出力先を明示指定、`@prisma/client`ではなく生成先から直接import）
  になっていたため、将来のv7移行も見据えてそのまま採用した。
- **Tailwind CSS**: v4がデフォルトでCSS-first設定に変わっている。特にリスクはないためv4を採用。

## ディレクトリ構成

```
progate_clone/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── prisma.config.ts
├── data/
│   └── app.db                      # SQLite本体（Git管理外）
├── content/                        # (ステップ2で作成) コース内容JSON
├── src/
│   ├── app/                        # Next.js App Router
│   ├── components/                 # (ステップ3〜4で作成)
│   ├── lib/
│   │   ├── prisma.ts               # 作成済み
│   │   ├── contentLoader.ts        # (ステップ2で作成)
│   │   └── judge/                  # (ステップ5で作成)
│   ├── types/                      # (ステップ2で作成)
│   └── generated/prisma/           # Prisma自動生成（Git管理外）
├── docs/
│   ├── progate_clone_design_doc.md
│   └── progress.md
└── CLAUDE.md
```

## 実装順序（設計書「9. 開発ステップ」）

1. **プロジェクト初期セットアップ** ← 今回実施
2. コンテンツ読み込み基盤
3. コース一覧・コース詳細画面
4. 学習画面（3ペイン）の実装
5. 正誤判定ロジック実装
6. 進捗保存機能の実装
7. HTML/CSSコースの中身を拡充
8. （将来）JavaScriptコース追加

1ステップずつ実装し、都度動作確認・報告を行い、ユーザーの確認後に次へ進む。

## 設計書に対する指摘事項（実装前に確認済み・今後の検討事項）

- Next.js/Prisma/Tailwindのバージョンについて上記の通りユーザーと相談し決定済み。
- 設計書「11. 未確定・今後詰めるべき点」は該当ステップ到達時に改めて相談する:
  - CSS判定の厳密さ（`getComputedStyle` vs 文字列パターン）→ ステップ5で検討
  - ヒント表示のタイミング → ステップ5で検討
  - レッスンの粒度・数 → ステップ2・7で検討
  - ダークモード対応の要否 → ステップ3・4で検討

---

## 2026-07-24: ステップ1 プロジェクト初期セットアップ

### 実施内容
- `create-next-app@15`でプロジェクトを作成（TypeScript / Tailwind v4 / App Router / ESLint /
  `src/`ディレクトリ / importエイリアス`@/*` / Turbopack有効）
- Prisma 6.19.3 + `@prisma/client`をインストールし、`prisma init --datasource-provider sqlite`で初期化
- `prisma/schema.prisma`に設計書5.1のモデル（`LessonProgress`, `CourseProgress`）を追加
- `DATABASE_URL`を`file:../data/app.db`に設定し、`npx prisma migrate dev --name init`で
  `data/app.db`を作成、Prismaクライアントを`src/generated/prisma`に生成
- `src/lib/prisma.ts`にPrismaクライアントのシングルトンを作成（開発時のホットリロードで
  クライアントが増殖しないようにglobalThisにキャッシュする一般的なパターン）
- `package.json`に`postinstall: prisma generate`を追加（クローン後の`npm install`だけで
  クライアントが再生成されるように）
- トップページ(`src/app/page.tsx`)をcreate-next-appのデフォルトから、疎通確認用の
  最小限の表示に置き換え
- `.gitignore`にSQLite DBファイル(`data/*.db`)とPrisma生成物(`src/generated/prisma`)を追加
  （`src/generated/prisma`はprisma initが自動追加）
- `.env.example`を追加（`DATABASE_URL`のテンプレート）
- `CLAUDE.md`を作成
- 本ファイル(`docs/progress.md`)を作成

### 変更・作成したファイル
- 新規: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`,
  `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `public/*`
- 新規: `prisma/schema.prisma`, `prisma/migrations/20260723164648_init/migration.sql`,
  `prisma.config.ts`, `.env`, `.env.example`
- 新規: `src/lib/prisma.ts`
- 新規: `.gitignore`（create-next-app生成分に追記）, `CLAUDE.md`, `docs/progress.md`
- 生成物（Git管理外）: `data/app.db`, `src/generated/prisma/`

### 動作確認結果
- `npm run lint` → エラーなし
- `npm run build` → ビルド成功（Turbopack、静的ページ生成も成功）
- `npm run dev`をバックグラウンドで起動し `curl http://localhost:3000/` → **HTTP 200**、
  「Progate Clone」「プロジェクト初期セットアップが完了しました」の表示を確認
- Prisma疎通確認: `tsx`で一時スクリプトを実行し、`prisma.lessonProgress.count()`が
  正常に`0`を返すことを確認（DB接続・スキーマとも正常）
- `npm audit`で高リスク3件を検出したが、いずれもNext.js自体が内部で使う`postcss`/`sharp`の
  バージョン範囲に起因し、現時点で公開されている全てのNext.jsバージョン（9.x〜16系preview）に
  共通する上流未修正の問題。`npm audit fix --force`はNext 9.3.3への大幅ダウングレードを
  提案するのみで非現実的なため、対応は保留し上流の修正を待つ。

### 次回やること（ステップ2: コンテンツ読み込み基盤）
- `content/html-css/course.json`と2〜3レッスン分のサンプルJSONを作成
- `src/types/lesson.ts`に型定義を作成
- `src/lib/contentLoader.ts`でJSON読み込みユーティリティを実装
- `/api/courses`, `/api/courses/[courseId]`等のAPIを実装し動作確認

---

## 2026-07-24: ステップ2 コンテンツ読み込み基盤

### 実施内容
- `src/types/lesson.ts`に設計書4.4節の型定義（`Slide`, `Lesson`, `Chapter`, `Course`等）を作成
- `content/html-css/course.json`を作成（第1章: HTMLの基本(2レッスン)、第2章: CSSで装飾する(1レッスン)）
- サンプルレッスンJSONを3件作成
  - `01-html-basic.json`（`<h1>`タグ、checkType: `contains-tag`）
  - `02-html-tags.json`（`<p>`タグ・`<ul>/<li>`タグ、checkType: `contains-tag`）
  - `03-css-basic.json`（`color`プロパティ、checkType: `css-property`）
  - 3種類のchekType（`contains-tag`, `css-property`）を実データでカバーし、ステップ5の判定ロジック実装に備えた
- `src/lib/contentLoader.ts`を実装（`fs`で`content/`配下のJSONを読み込む）
  - `getAllCourses()`: 全コースのメタ情報一覧を取得
  - `getCourseById(courseId)`: 指定コースの章・レッスン一覧を取得（存在しなければ`null`）
  - `getLessonById(courseId, lessonId)`: 指定レッスンのスライド内容を取得（存在しなければ`null`）
- 設計書8節のAPI設計に沿って、コース/レッスン系の3エンドポイントを実装
  - `GET /api/courses`
  - `GET /api/courses/[courseId]`
  - `GET /api/courses/[courseId]/lessons/[lessonId]`
  - いずれもNext.js 15の非同期`params`規約（`await params`）に対応
  - 存在しないIDの場合は`404`と`{ error: string }`を返す

### 変更・作成したファイル
- 新規: `src/types/lesson.ts`
- 新規: `content/html-css/course.json`
- 新規: `content/html-css/lessons/01-html-basic.json`, `02-html-tags.json`, `03-css-basic.json`
- 新規: `src/lib/contentLoader.ts`
- 新規: `src/app/api/courses/route.ts`
- 新規: `src/app/api/courses/[courseId]/route.ts`
- 新規: `src/app/api/courses/[courseId]/lessons/[lessonId]/route.ts`

### 動作確認結果
- 全JSONファイルを`python3 -m json.tool`で構文チェック → 全て正常
- `npm run lint` → エラーなし
- `npm run build` → ビルド成功（3つのAPIルートが動的ルートとして正しく認識されている）
- `npm run dev`で起動し、`curl`で全エンドポイントを確認
  - `GET /api/courses` → **HTTP 200**、コース一覧JSONを返却
  - `GET /api/courses/html-css` → **HTTP 200**、章・レッスン一覧を返却
  - `GET /api/courses/html-css/lessons/01-html-basic` → **HTTP 200**、スライド内容を返却
  - `GET /api/courses/not-exist` → **HTTP 404**、`{"error":"Course not found"}`を返却（異常系も確認）

### 次回やること（ステップ3: コース一覧・コース詳細画面）
- `/`（コース一覧トップページ）を実装し、`CourseCard`コンポーネントでコース一覧を表示
- `/courses/[courseId]`（コース詳細ページ）を実装し、章立て・レッスン一覧を表示
- この時点では進捗（完了/未着手など）はダミー表示でよい（進捗DB連携はステップ6）

---

## 2026-07-24: ステップ3 コース一覧・コース詳細画面

### 実施内容
- `src/components/CourseCard.tsx`を作成（Server Component。コースタイトル・説明・
  レッスン総数を表示し、コース詳細ページへリンク。進捗表示は設計書の指示通り
  「0 / 合計レッスン数」のプレースホルダー。実データ連携はステップ6で行う）
- `src/app/page.tsx`（トップページ）を、`contentLoader.getAllCourses()`から取得した
  コース一覧を`CourseCard`でグリッド表示するように更新
- `src/app/courses/[courseId]/page.tsx`（コース詳細ページ）を新規作成
  - 章（Chapter）ごとに`<details>/<summary>`によるネイティブアコーディオンで表示
    （クライアントJS不要でシンプルに実装、設計書6.2の「アコーディオン」要件を満たす）
  - 各レッスンへのリンクと、ステータス表示（現時点では全て「未着手」固定。
    実際のステータス判定はステップ6で実装）
  - 存在しない`courseId`の場合は`next/navigation`の`notFound()`で標準404を表示
- ページ・コンポーネントはServer Componentとして実装（クライアント状態が不要なため
  `"use client"`は使用していない）

### 変更・作成したファイル
- 新規: `src/components/CourseCard.tsx`
- 新規: `src/app/courses/[courseId]/page.tsx`
- 変更: `src/app/page.tsx`（デフォルト表示 → コース一覧表示）

### 動作確認結果
- `npm run lint` → エラーなし
- `npm run build` → ビルド成功。`/`, `/courses/[courseId]`が正しく認識されている
- `npm run dev`で起動し`curl`で確認
  - `GET /` → **HTTP 200**、「HTML/CSS基礎コース」のカードと「レッスン完了」の
    プレースホルダー表示を確認
  - `GET /courses/html-css` → **HTTP 200**、「第1章: HTMLの基本」「HTMLとは」
    「段落とリストのタグ」「CSSで文字に色をつける」の表示を確認
  - `GET /courses/not-exist` → **HTTP 404**（`notFound()`が正しく機能）

### 既知の制限（次ステップで解消予定）
- コース詳細ページの各レッスンリンク（`/courses/[courseId]/lessons/[lessonId]`）は
  学習画面がまだ存在しないため、クリックすると404になる。ステップ4で実装する。

### 次回やること（ステップ4: 学習画面（3ペイン）の実装）
- `/courses/[courseId]/lessons/[lessonId]`ページを新規作成
- スライド解説・問題文の表示とスライド送り（前へ/次へ）を実装
- CodeMirror 6を導入し、コードエディタを実装（starterCodeを初期表示）
  → 導入理由: 設計書2節で指定された軽量・拡張しやすいエディタライブラリのため
- iframe(srcdoc)による実行結果プレビューの土台を実装
- 正誤判定・進捗保存はまだ行わない（ステップ5・6で実装）

---

## 2026-07-24: ステップ4 学習画面（3ペイン）の実装

### 新規ライブラリ導入
- **`@uiw/react-codemirror`** (+ `@codemirror/lang-html`, `@codemirror/state`,
  `@codemirror/view`, `@codemirror/theme-one-dark`, `codemirror`)
  - 導入理由: 設計書でエディタとして指定されている CodeMirror 6 を素のAPIで
    Reactに組み込む場合、`EditorView`の生成・破棄や値の同期を`useRef`/`useEffect`で
    手動管理する必要があり複雑になる。`@uiw/react-codemirror`は広く使われている
    実績のあるReact用ラッパーで、`<CodeMirror value={} onChange={} />`という
    シンプルなPropsベースのAPIを提供するため、保守性・可読性・「未経験者にも
    理解しやすいコード」という方針に合致すると判断した。

### 実施内容
- `src/components/SlidePanel.tsx`: 左ペイン。スライド番号(`n / 総数`)、
  explanation本文またはexercise問題文+ヒント、前へ/次へボタンを表示する
  プレゼンテーショナルコンポーネント
- `src/components/CodeEditor.tsx`（`"use client"`）: CodeMirror 6 + HTML言語モードの
  コードエディタ。`value`/`onChange`をpropsで受け取るだけのシンプルな作り
- `src/components/PreviewPane.tsx`: `iframe srcDoc`で受け取ったコードをそのまま
  レンダリングする実行結果プレビュー。`sandbox="allow-same-origin"`のみを指定し
  `allow-scripts`は付けていない（HTML/CSSコースでは`<script>`実行が不要なため、
  安全側に倒した設定。将来JSコース追加時に`allow-scripts`の要否を検討する）
- `src/components/LessonWorkspace.tsx`（`"use client"`）: スライドindexとコード文字列を
  Stateで保持する3ペインのコンテナ。スライド切り替え時、exerciseスライドなら
  `starterCode`で、explanationスライドなら空文字でコードをリセットする
- `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`: レッスンをServer Component
  として取得し、`LessonWorkspace`（Client Component）に渡す構成。存在しない
  lessonIdは`notFound()`で404

正誤判定ボタン・ヒント表示のトリガー・進捗保存は設計書の通りステップ5・6で実装するため、
本ステップではプレビューは入力するたびに即座に更新される「土台」の状態にとどめている。

### 変更・作成したファイル
- 新規: `src/components/SlidePanel.tsx`, `CodeEditor.tsx`, `PreviewPane.tsx`, `LessonWorkspace.tsx`
- 新規: `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`
- 変更: `package.json` / `package-lock.json`（CodeMirror関連パッケージ追加）

### 動作確認結果
- `npm run lint` → エラーなし
- `npm run build` → ビルド成功（学習画面ルートが約195KBの追加バンドルとして認識、妥当な範囲）
- **実ブラウザでの動作確認**（Playwright + Chromiumを使用。`run`スキルの案内に従い、
  `chromium-cli`が未導入の環境だったためPlaywrightで代替）:
  - `http://localhost:3000/courses/html-css/lessons/01-html-basic`を開き、
    左ペインに解説文、右上にCodeMirmorエディタ、右下にiframeプレビューの
    3ペインレイアウトが正しく表示されることをスクリーンショットで確認
  - 「次へ」クリックでexerciseスライド(2/2)に切り替わり、問題文・ヒント・
    starterCodeが正しく表示されることを確認（最終スライドのため「次へ」は無効化）
  - エディタに`<h1>Hello World</h1>`を入力 → iframeプレビューが即座に更新され、
    「Hello World」の見出しがレンダリングされることを確認
    (`iframe.contentDocument`から`h1`のtextContentを取得して検証)
  - ブラウザコンソールエラー: **0件**

### 次回やること（ステップ5: 正誤判定ロジック実装）
- `src/lib/judge/htmlCssJudge.ts`を実装し、`checkType`（`contains-tag`, `css-property`）
  ごとの判定関数をStrategyパターンでディスパッチ
- 学習画面に「実行して確認する」ボタンを追加し、押下時に`iframe.contentDocument`を
  判定ロジックに渡して正誤判定
- 正解時は次のスライドへ自動的に進める、不正解時はヒントを表示する動作を実装
- 設計書11節の「CSS判定の厳密さ」「ヒント表示のタイミング」を実装時に検討・決定する

---

## 2026-07-24: ステップ5 正誤判定ロジック実装

### 設計書11節の未確定事項に対する判断
- **CSS判定の厳密さ**: `getComputedStyle`による厳密判定を採用しつつ、
  「期待値の文字列（例: `"red"`）」と「ブラウザが解決した実際の値（例: `"rgb(255, 0, 0)"`）」の
  表記ゆれを吸収するため、非表示のprobe要素に同じ値を設定して`getComputedStyle`を通し、
  ブラウザ自身に正規化させてから比較する方式を採用した。プロパティごとに色名↔rgb変換表を
  自前で持つ必要がなく、`color`以外のプロパティにも汎用的に対応できる。
- **ヒント表示のタイミング**: 「不正解1回目から表示する」方針とした。個人学習用ツールであり
  ゲーム性よりも学習効率を優先するため、つまずいたらすぐヒントが見える方が親切と判断。
  また、常時表示ではなく「不正解を1回試した後にのみ」表示することで、設計書6.3の
  「不正解ならヒント表示」という指示にも合致させた（ステップ4では常時表示にしていたSlidePanelの
  ヒントを撤去し、`ResultChecker`側に移動した）。

### 実施内容
- `src/lib/judge/types.ts`: `JudgeResult = { correct: boolean; message?: string }`
- `src/lib/judge/htmlCssJudge.ts`: `judgeExercise()`が`checkType`に応じて
  `checkContainsTag`/`checkCssProperty`にディスパッチするStrategyパターンで実装
- `src/components/ResultChecker.tsx`: 「実行して確認する」ボタン、正誤メッセージ、
  不正解時のみのヒント表示を担当するコンポーネント
- `src/components/PreviewPane.tsx`: React 19の「refをpropsとして受け取る」新方式で
  `ref`を追加し、親から`iframe.contentDocument`にアクセスできるように変更
- `src/components/LessonWorkspace.tsx`: 「実行して確認する」押下時に`judgeExercise`を呼び、
  結果をStateに保持。正解時は1秒後に自動で次のスライドへ遷移する処理を追加
- `src/components/SlidePanel.tsx`: 常時表示していたヒントを削除（ResultChecker側に一本化）

### 変更・作成したファイル
- 新規: `src/lib/judge/types.ts`, `src/lib/judge/htmlCssJudge.ts`, `src/components/ResultChecker.tsx`
- 変更: `src/components/PreviewPane.tsx`, `src/components/LessonWorkspace.tsx`, `src/components/SlidePanel.tsx`

### 動作確認結果
- `npm run lint` → エラーなし
- `npm run build` → ビルド成功
- **実ブラウザでの動作確認**（Playwright + Chromium、`02-html-tags`レッスンで検証）:
  - 不正解（`<p>wrong</p>`）を入力して「実行して確認する」→ 赤字のエラーメッセージと
    ヒントが表示されることを確認
  - 正解（`<p>Progateで学習しています</p>`）を入力して実行 → 緑字で「正解です！次の
    スライドに進みます。」と表示され、約1秒後にスライドが自動で2/3→3/3へ進むことを確認
  - ブラウザコンソールエラー: **0件**

### 次回やること（ステップ6: 進捗保存機能の実装）
- `prisma/schema.prisma`は既にステップ1で確定済みのため追加変更は不要な見込み
  （必要であれば設計書との差異を確認の上で調整）
- `/api/progress`（GET/POST）を実装し、レッスンの`currentSlide`・`status`をDBに保存
- 学習画面（`LessonWorkspace`）からスライド遷移時・正解時に進捗更新APIを呼び出す
- コース一覧・コース詳細ページのプレースホルダー進捗表示を実データに置き換える

---

## 2026-07-24: ステップ6 進捗保存機能の実装

### 実施内容
- `src/lib/progress.ts`を新規作成
  - `getAllCourseProgress()`: 全コースの`{ courseId, totalLessons, completedLessons }`を返す
    （`CourseProgress`テーブルに未作成のコースはレッスン0件完了として扱う）
  - `getLessonProgressMap(courseId)`: コース内の各レッスンの`status`/`currentSlide`をMapで返す
  - `updateLessonProgress()`: `LessonProgress`をupsertしつつ、一度「完了」になったレッスンは
    後でスライドを見返しても未完了へ後退させない（一度`completed`なら`completed`を維持）
  - 更新のたびに`CourseProgress`（完了レッスン数のキャッシュ）を実データから再集計して同期
    （インクリメンタルに数値を足し引きするのではなく都度カウントし直す方式にし、
    ズレが蓄積するバグを防止）
- `src/app/api/progress/route.ts`: `GET`（一覧取得）と`POST`（進捗更新、バリデーション付き・
  不正な値は400を返す）を実装
- `src/components/LessonWorkspace.tsx`: レッスンを開いた初回と、スライド遷移のたびに
  `/api/progress`へPOSTするように変更（`courseId`をpropsに追加）
- コース一覧(`src/app/page.tsx`)・コース詳細(`src/app/courses/[courseId]/page.tsx`)の
  プレースホルダー表示を、`getAllCourseProgress()`/`getLessonProgressMap()`から取得した
  実データに置き換え

### 設計上の判断（Server ComponentからのAPI呼び出し方針）
設計書8節では`GET /api/progress`が「トップページ用」と明記されているが、トップページ
（Server Component）が自分自身のAPI Routeをfetchするのは不要なネットワークホップになるため、
`src/lib/progress.ts`の関数をAPI RouteとServer Componentの両方から直接呼び出す共通ロジック層
として実装した。`/api/progress`のGET/POSTは設計書通りAPIとして存在し、クライアント側
（`LessonWorkspace`の進捗POST）から実際に利用されている。

### 重大な不具合の発見と修正（Next.js + Turbopack + Prisma + SQLite相対パス問題）
`npm run build`時にトップページの静的プリレンダリングで
`Error code 14: Unable to open the database file`が発生。原因は2点:
1. 進捗表示は本質的に「都度変わる動的データ」であり、静的プリレンダリング対象にすべきでは
   なかった → `/`と`/courses/[courseId]`に`export const dynamic = "force-dynamic"`を追加
2. それでも`npm run dev`実行時に同じエラーが発生することが判明。`.env`の
   `DATABASE_URL="file:../data/app.db"`という相対パスが、Next.js(Turbopack)のランタイム
   実行コンテキストでは正しく解決されないことが原因（Prisma CLIからは正しく解決される）。
   → `src/lib/prisma.ts`で`path.join(process.cwd(), "data", "app.db")`により絶対パスを
   組み立て、`new PrismaClient({ datasourceUrl })`で明示的に上書きするよう修正。
   `.env`の値はPrisma CLI（migrate等）専用として残している。

### 変更・作成したファイル
- 新規: `src/lib/progress.ts`, `src/app/api/progress/route.ts`
- 変更: `src/lib/prisma.ts`（絶対パスでのDB接続に修正）
- 変更: `src/components/LessonWorkspace.tsx`（進捗POST機能を追加、`courseId` prop追加）
- 変更: `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`（`courseId`を渡すよう修正）
- 変更: `src/components/CourseCard.tsx`（progress propsを受け取るように変更）
- 変更: `src/app/page.tsx`（実進捗データの取得・`force-dynamic`化）
- 変更: `src/app/courses/[courseId]/page.tsx`（実ステータス表示・`force-dynamic`化）

### 動作確認結果
- `npm run lint` → エラーなし
- `npm run build` → ビルド成功（修正前は`/`のプリレンダリングでDBエラーが発生することを確認済み）
- **実ブラウザでの動作確認**（Playwright + Chromium）:
  - 学習前: トップページで「0 / 3 レッスン完了」を確認
  - `01-html-basic`レッスンを最後まで正解して完了 → コース詳細ページで該当レッスンが
    「完了」表示に変化することを確認
  - トップページの進捗表示が「1 / 3 レッスン完了」に更新されることを確認
  - `GET /api/progress`が実データ(`[{"courseId":"html-css","totalLessons":3,"completedLessons":1}]`)を
    返すことを`curl`で確認
  - `POST /api/progress`に不正なボディを送ると`400`+`{"error":"Invalid request body"}`を
    返すことを確認（異常系）
  - ブラウザコンソールエラー: **0件**
  - 検証で作成したテスト用進捗データは、コミット前にスクリプトで削除しクリーンな状態に戻した

### 次回やること（ステップ7: HTML/CSSコースの中身を拡充）
- 設計書10節のMVPスコープに沿って、実際に学習に使える分量までレッスン数を拡充
- 設計書11節の「レッスンの粒度・数」をどの程度まで拡充するか、方針を確認しながら進める
- 拡充した内容でも判定ロジック・進捗保存が問題なく動作することを回帰確認する
