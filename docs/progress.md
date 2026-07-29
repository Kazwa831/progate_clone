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

---

## 2026-07-24: ステップ7 HTML/CSSコースの中身を拡充

### レッスン粒度・数についての判断（設計書11節）
既存3レッスンに加え、初学者向けHTML/CSSコースとして最低限押さえておきたい基本トピック
（リンク・画像、div/class によるグループ化、ボックスモデル、Flexbox）をカバーする4レッスンを
追加し、合計7レッスン・2章構成とした。無制限に増やすのではなく「就活ポートフォリオとして
一通りの基礎が触れられる」範囲に抑え、量よりも一つ一つの判定が正確に動作することを優先した。

### 実施内容
- `content/html-css/lessons/04-html-links-images.json`（新規、第1章）:
  `<a href>`によるリンク、`<img src alt>`による画像表示
- `content/html-css/lessons/05-html-div-class.json`（新規、第1章）:
  `<div>`と`class`属性によるグループ化
- `content/html-css/lessons/06-css-box-model.json`（新規、第2章）:
  `padding`・`border`によるボックスモデルの基本
- `content/html-css/lessons/07-css-flexbox.json`（新規、第2章）:
  `display: flex`による横並びレイアウト
- `content/html-css/course.json`を更新し、上記4レッスンを章立てに追加
  （第1章4レッスン、第2章3レッスンの計7レッスン）

### 実装前の検証（判定ロジックの前提確認）
`padding`/`border`のようなCSSショートハンドプロパティは、ブラウザによっては
`getComputedStyle().getPropertyValue()`で空文字が返り判定不能になる懸念があったため、
レッスンJSONを書く前にPlaywright+Chromiumで実際の挙動を検証した。Chromiumでは
`padding`→`"20px"`、`border`→`"1px solid rgb(255, 0, 0)"`のように正しく解決されることを
確認できたため、既存の`css-property`判定ロジック（ステップ5で実装したprobe正規化方式）を
そのまま流用できると判断した。

### 変更・作成したファイル
- 新規: `content/html-css/lessons/04-html-links-images.json`, `05-html-div-class.json`,
  `06-css-box-model.json`, `07-css-flexbox.json`
- 変更: `content/html-css/course.json`

### 動作確認結果
- 全JSONファイルを`python3 -m json.tool`で構文チェック → 全て正常
- `npm run lint` / `npm run build` → いずれも成功
- `GET /api/courses/html-css`で章立て(7レッスン)が正しく返ることを確認
- **実ブラウザでの動作確認**（Playwright + Chromium）: 追加した4レッスン・6つの演習すべてで
  正解コードを入力し「正解です」の判定が出ることを確認
  - リンク（`<a>`のテキスト判定）、画像（`<img>`タグの存在判定）
  - div+class（`div.box`セレクタでのテキスト判定）
  - padding, border（ショートハンドCSSプロパティの判定）
  - display: flex（Flexboxレイアウトの判定）
  - ブラウザコンソールエラー: 1件（`<img src="logo.png">`が実在しない画像パスのため
    ブラウザが404を出すもので、演習用のダミーパスによる想定内の挙動。アプリの不具合ではない）
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

### 次回やること（ステップ8: 将来のJavaScriptコース追加の設計確認）
- 設計書9節の最終ステップ。`content/javascript/`を追加し、`judge`にJS用ロジックを追加する
  だけで拡張できることを実証する（設計段階の確認が主目的で、フル実装はスコープ外）
- 拡張性の検証が目的のため、実装範囲についてユーザーと相談してから着手する

---

## 2026-07-24: ステップ8 将来のJavaScriptコース拡張性検証

設計書10節で「将来拡張（設計だけ考慮）」と明確に位置づけられているステップのため、
「最小限の拡張性検証のみ」で実装する方針をユーザーに確認した上で着手した。

### 新規ライブラリ導入
- **`@codemirror/lang-javascript`**: JavaScriptコースのコードエディタにJS向けシンタックス
  ハイライトを提供するため。ステップ4で導入した`@codemirror/lang-html`と同じ位置づけの
  言語モードパッケージで、コースの`language`に応じて`CodeEditor`が使用する言語拡張を
  切り替えられるようにした。

### 設計上の判断（iframeサンドボックスとpostMessage）
設計書7.3節の指示通り、JavaScript実行は「iframe内で`<script>`を実行し、`console.log`を
フックしてpostMessageで結果を親ウィンドウに送信」という方式で実装した。HTML/CSSコースのように
`sandbox="allow-same-origin"`にして`contentDocument`を直接読む案も検討したが、
`allow-scripts`と`allow-same-origin`を同一iframeに同時に付与するのはサンドボックスを
回避されうる既知のリスクがあるため避け、`allow-scripts`のみを付与しpostMessageで結果を
受け渡す設計とした。これにより「HTML/CSSコースはDOM直接検証、JSコースはpostMessage」という、
言語ごとに適切な検証方式を選べる構造になった。

### 実施内容
- `src/types/lesson.ts`: `checkType`に`"js-output-equals"`を追加
- `src/lib/judge/javascriptJudge.ts`（新規）:
  - `buildJsRunnerHtml(code)`: ユーザーのJSコードを、`console.log`フック＋実行結果の
    `postMessage`送信＋出力のiframe内テキスト表示を行うHTMLでラップする
  - `judgeJavaScriptOutput(result, checkType, checkRule)`: 受け取ったログ配列から
    `checkType: "js-output-equals"`を判定する純粋関数（iframeへの直接アクセス不要）
- `src/components/PreviewPane.tsx`: `language`propsを追加し、JavaScriptコースの場合のみ
  `buildJsRunnerHtml`でラップ、`sandbox`属性も`allow-scripts`のみに切り替え
- `src/components/CodeEditor.tsx`: `language`propsに応じて`html()`/`javascript()`の
  CodeMirror拡張を切り替え
- `src/components/LessonWorkspace.tsx`: `courseLanguage`propsを追加。JSコースの場合のみ
  `window`の`message`イベントを購読して実行結果をStateに保持し、`handleCheck`は
  コース言語に応じて`htmlCssJudge`（DOM直接検証）と`javascriptJudge`（postMessage結果の
  純粋関数判定）を出し分ける。正解時の自動遷移は判定方式に依らない共通のuseEffectに整理
- `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`: コース情報も取得し
  `courseLanguage`を`LessonWorkspace`に渡すよう変更
- `content/javascript/course.json` + `content/javascript/lessons/01-console-log.json`
  （新規）: `console.log(1 + 2);`の出力を判定する最小限の1レッスンを追加

### 動作確認結果（拡張性の実証）
- `contentLoader.ts`・APIルート・コース一覧/詳細ページには**一切コード変更を加えていない**が、
  `content/javascript/`を追加しただけでJavaScriptコースがトップページ・API
  (`GET /api/courses`)に自動的に表示されることを確認 → 設計書が意図した拡張性
  （コンテンツ追加のみでコース追加可能）を実証できた
- `npm run lint` / `npm run build` → いずれも成功
- **実ブラウザでの動作確認**（Playwright + Chromium）:
  - トップページにJavaScript基礎コースのカードが表示されることを確認
  - `console.log(1 + 1);`（不正解）を入力して実行 →
    「出力結果が「3」になっていません」の表示を確認
  - `console.log(1 + 2);`（正解）を入力して実行 → 「正解です」の表示を確認
  - ブラウザコンソールエラー: **0件**
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

### 今回のスコープ外（design doc通り将来拡張として残す部分）
- JavaScriptコースのレッスン拡充（現在1レッスンのみ、拡張性の実証が目的のため）
- Pyodideを使ったPythonコース
- SQLコース

これで設計書「9. 開発ステップ」の全8ステップが完了した。

---

## 2026-07-25: UI可読性・配色統一の改善（ダークモード対応）

### 背景
ユーザーからダークモードでスクリーンショット2枚の提供を受け、`text-gray-900`のような
ハードコードされたTailwindクラスが、CSS変数駆動で暗くなる背景色にまったく追従しておらず、
タイトルや本文がほぼ不可視になっていることが判明した。トップページ・学習画面の両方で発生。

### 実施内容

**1. デザイントークン基盤の整備 (`src/app/globals.css`)**
`background` / `foreground` の2値しかなかった状態から、以下のセマンティックトークンを追加し、
ライト/ダークそれぞれで値を定義（`@theme inline`でTailwindユーティリティ化）:
- `card` / `card-foreground`（パネル・ヘッダー等の面）
- `muted` / `muted-foreground`（補助テキスト、hover背景）
- `border` / `ring`（境界線・フォーカスリング）
- `primary` / `primary-hover` / `primary-foreground` / `primary-text`（進むボタン・リンク）
- `secondary` / `secondary-hover` / `secondary-foreground`（戻るボタン等）
- `destructive-foreground` / `destructive-text`（エラー表示）
- `success` / `success-hover` / `success-foreground` / `success-text`（正解・実行ボタン）

`primary`/`destructive`/`success`の「ボタン塗り」用の値は白文字とのコントラストが
ライト/ダーク双方で十分（目安WCAG AA 4.5:1以上）なため共通の値を採用し、一方
「地の背景に直接乗るテキスト」用の`-text`系トークンのみライト/ダークで別値にした
（例: `success-text`はライトで緑700・ダークで緑400など、背景の明暗に応じて可読性を確保）。

**2. 全コンポーネントの色トークン化**
`layout.tsx`, `page.tsx`, `courses/[courseId]/page.tsx`,
`courses/[courseId]/lessons/[lessonId]/page.tsx`, `CourseCard.tsx`, `SlidePanel.tsx`,
`ResultChecker.tsx`, `LessonWorkspace.tsx`の`text-gray-*`/`bg-gray-*`/`text-blue-*`/
`bg-green-*`等のハードコード値をすべて上記トークンに置き換え。HTML/CSSコースの
プレビューiframeのみ`bg-white`を意図的に維持（素のHTMLページの実際のデフォルト背景を
再現するため。この点は変更していない）。

**3. コードエディタのダークモード対応**
`CodeEditor.tsx`に`window.matchMedia("(prefers-color-scheme: dark)")`での検知を追加し、
ダークモード時のみステップ4で導入済みだった`@codemirror/theme-one-dark`を適用
（それまで未使用のまま放置されていた）。これによりエディタが常に白背景のまま
周囲のダークUIから浮いていた状態を解消。

**4. hover / focus / active / disabled 状態の整備**
- 全ボタン・リンクに`focus-visible:ring-2 focus-visible:ring-ring`を追加
  （キーボード操作時のフォーカス表示が実質無かった状態を解消）
- 無効化ボタン（前へ/次へ）に`disabled:cursor-not-allowed`を追加
- ボタンに`transition-colors`を追加しhover時の変化を滑らかに

**5. 配色以外のUI/UX改善（機能・画面遷移は変更なし）**
- コースカードに進捗バー（視覚的なバー表示）を追加。設計書6.1節で当初から
  「進捗バー」の表示が指定されていたが、これまでテキストのみだったため実装を補完
- コース詳細ページの完了レッスンにチェックマークアイコンを追加。こちらも設計書6.2節
  「完了レッスンにはチェックマーク」の指定を満たす形に補完
- `ResultChecker`の正誤フィードバックに色付き背景枠＋アイコン（✓/⚠）を追加し、
  一目で正誤がわかるように改善
- `<html lang="en">` → `lang="ja"`に修正（内容は全て日本語のため）
- ページタイトル/descriptionをcreate-next-appのデフォルト（"Create Next App"）から
  アプリの実際の名前・説明に修正
- `body`のfont-familyが`Arial, Helvetica, sans-serif`に決め打ちされており、
  実際に読み込んでいるGeistフォントが適用されていなかった不具合を修正
  （`font-sans`ユーティリティ経由でGeistが正しく反映されるように）
- スライド本文・説明文に`leading-relaxed`を追加し行間を改善

### 変更したファイル一覧
- `src/app/globals.css`（トークン全面刷新）
- `src/app/layout.tsx`（lang, metadata, フォント適用修正）
- `src/app/page.tsx`
- `src/app/courses/[courseId]/page.tsx`
- `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`
- `src/components/CourseCard.tsx`（進捗バー追加）
- `src/components/SlidePanel.tsx`
- `src/components/ResultChecker.tsx`（フィードバックデザイン改善）
- `src/components/CodeEditor.tsx`（ダークテーマ対応）
- `src/components/LessonWorkspace.tsx`
- `src/components/icons.tsx`（新規、Check/Alert/Playアイコン）

### 動作確認結果
- `npm run lint` → エラーなし
- `npm run build` → ビルド成功
- **実ブラウザでの確認**（Playwright、`colorScheme: "light"`と`"dark"`の両方でテスト）:
  - トップページ・コース詳細ページ・学習画面（HTML/CSS・JavaScript双方）を
    ライト/ダーク両方でスクリーンショット撮影し、全てのテキストが背景に対して
    十分なコントラストで表示されることを目視確認
  - ダークモードでコードエディタがoneDarkテーマで表示されることを確認
  - 正解・不正解のフィードバック表示（アイコン＋色付き背景）がライト/ダーク両方で
    見やすく表示されることを確認
  - 完了レッスンのチェックマーク表示を確認
  - ブラウザコンソールエラー: **0件**（ライト・ダークとも）
  - 機能・画面遷移（ルーティング、判定ロジック、進捗保存API）には一切手を加えておらず、
    既存の動作に影響がないことを確認

---

## 2026-07-25: Progateの学習体験を参考にしたUI/学習フロー刷新 + コース大幅拡充

ユーザーから提供されたProgateの実画面スクリーンショット2枚（スライド画面・コード演習画面）を
参考に、現状のUI/UXとの差分を分析した上で改善した。単なる見た目の模倣ではなく、
「学習しやすさ」を軸に、データスキーマ・コンポーネント構成・教材内容を一体で見直している。

### ①② UI・学習フローの改善

**新しいスライド構成（explanation → example → exercise）**
`src/types/lesson.ts` の `Slide` 型に `example`（完成イメージスライド）を追加し、
「説明 → 完成イメージ → 実際に書くコード」という設計書指定の流れを型レベルで表現した。
「完成イメージ」は静的な画像ではなく、そのコードを実際にプレビューでレンダリングする方式を
採用した（理由: 静的画像は用意・更新のコストが高く不正確になりやすいが、ライブレンダリングは
常に正確で、既存のiframeプレビュー基盤をそのまま再利用できるため）。

**サイドバーの新設 (`src/components/LessonSidebar.tsx`)**
学習画面の左側に、コース名・全体の進捗バー・章ごとのレッスン一覧（現在地をハイライト、
完了レッスンにチェックマーク）を表示する常設サイドバーを追加。Progateのサイドバーを参考にしつつ、
Server Componentとして実装し不要なクライアントJSを増やさないようにした（`<details>`による
折りたたみはネイティブHTML機能で実現）。

**レッスンをまたいだ「次へ／前へ」ナビゲーション**
`src/lib/courseNavigation.ts` を新設し、章をまたいだコース内の全レッスン順序・前後のレッスンを
計算できるようにした。既存の「次へ／前へ」ボタンを拡張し、レッスン最後のスライドで正解すると
自動的に次のレッスンへ遷移するようにした（ボタンラベルも「次のレッスンへ →」に変化し、
「次のレッスン: ○○」というプレビューテキストも表示）。最初のレッスンの「前へ」はコース詳細
ページへ、コース最後のレッスンの「次へ」は無効化されるようにし、行き止まりをなくした。

**その他のUI改善**
- コードエディタ・プレビューにタブ風のヘッダー（`index.html`など）を追加し、Progateの
  エディタ画面に寄せた
- 「実行して確認する」に加え、「リセット」（starterCodeに戻す）・「答えを見る」
  （模範解答を表示）ボタンを追加
- 教材テキスト中の `` `<h1>` `` のようなバッククォート表記をコード風チップとして
  ハイライトする `InlineText` コンポーネントを新設
- 「ポイント」「よくある間違い」の表示欄を追加（アイコン付き）

### 発見して修正した不具合
実装中の動作確認で、レッスンの最後のスライドに正解しても次のレッスンへ自動遷移しない
不具合を発見（自動遷移のuseEffectが「最後のスライドなら何もしない」で早期returnしていた）。
次のレッスンが存在する場合はrouter.pushで遷移するよう修正した。
また、進捗が「単にスライドを送っただけ」で完了扱いになっていた既存の粗さも見直し、
最後のスライドの問題に**正解したときだけ**完了とみなすよう`reportProgress`の呼び出し方を
修正した（複数レッスン・複数章をまたぐようになり、この不正確さの影響が大きくなるため）。

### ③④⑤ 教材の大幅拡充（7章・26レッスン）
設計書の元のスコープ（3レッスンのみ）から、指定された7章構成に全面刷新した。

| 章 | レッスン数 | 内容 |
|---|---|---|
| 1章：HTMLに触れてみよう！ | 5 | タグの仕組み、見出しと段落、リスト、リンク、画像 |
| 2章：CSSに触れてみよう！ | 5 | CSSの仕組み、文字装飾、背景と余白、枠線と角丸、クラスセレクタ |
| 3章：レイアウトを作ろう！ | 3 | Flexboxで横並び、配置調整、サイズ指定 |
| 4章：ヘッダーを作ろう！ | 3 | header構造、nav横並び、装飾 |
| 5章：フッターを作ろう！ | 3 | footer構造、リンク配置、装飾 |
| 6章：コンテンツを作ろう！ | 3 | section、カード一覧、画像+テキスト |
| 7章：お問い合わせフォームを作ろう！ | 4 | form基本、複数入力欄、送信ボタン、全体装飾 |

各レッスンは「説明（なぜそうするのか）→ 完成イメージ → 演習（ヒント・よくある間違い・
ポイント付き）」の構成で設計した。判定ロジック(`htmlCssJudge.ts`)は新しいチェック内容
（属性値の一致、複数要素の個数チェック）に対応させるため`checkContainsTag`を拡張したが、
`checkType`自体は既存の`contains-tag`/`css-property`のみで全レッスンをカバーできており、
判定ロジックの新規追加は不要だった（CSSセレクタ文字列の工夫だけで、フォームの属性チェックや
ヘッダー内の入れ子要素チェックまで表現できた）。

**教材設計上の重要な判断**: `margin: 0 auto` のような値は`getComputedStyle`で解決すると、
配置場所によって実際のpx値が変わってしまい正確に判定できないことを実装前にPlaywrightで検証し
判明した。そのため中央寄せの演習は`margin:auto`ではなく、判定が安定するFlexboxの
`justify-content`/`align-items`（キーワード値）を使う設計に変更した。

### 変更・作成したファイル一覧
- 新規: `src/lib/courseNavigation.ts`（レッスン順序・前後レッスン計算）
- 新規: `src/components/LessonSidebar.tsx`（サイドバー）
- 新規: `src/components/InlineText.tsx`（コード風チップのインライン表示）
- 変更: `src/types/lesson.ts`（`example`スライド追加、`points`/`commonMistakes`追加）
- 変更: `src/lib/judge/htmlCssJudge.ts`（属性値チェック・複数要素チェックに対応）
- 変更: `src/components/icons.tsx`（Book/Lightbulb/Sparkle/Reset/Eye/Chevronアイコン追加）
- 変更: `src/components/SlidePanel.tsx`（explanation/example/exercise対応、ポイント表示）
- 変更: `src/components/ResultChecker.tsx`（リセット・答えを見る・よくある間違い表示）
- 変更: `src/components/LessonWorkspace.tsx`（レッスン間ナビゲーション、進捗判定の修正）
- 変更: `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`（サイドバー・章情報を追加）
- 新規/全面刷新: `content/html-css/course.json`、`content/html-css/lessons/ch*.json`（26ファイル）
- 削除: 旧構成のレッスンJSON7ファイル（新構成に統合）

### 動作確認結果
- `npm run lint` / `npm run build` → いずれも成功
- **教材の自動検証**: 全26レッスン・31演習について、Playwrightで各`solutionCode`を実際に
  ブラウザでレンダリングし、判定ロジックが`correct: true`を返すことを自動チェック
  → **全問正解を確認**（1問も判定ミスなし）。また、`starterCode`の時点では
  どの問題も正解扱いにならないことも確認
- **実ブラウザでの手動確認**（Playwright + Chromium、ライト/ダーク両方）:
  - サイドバーに7章すべてが表示され、現在の章が自動的に開いた状態になることを確認
  - レッスン内のスライド送り（explanation→example→exercise）、正誤判定、
    ヒント/よくある間違いの表示を確認
  - レッスン最後の問題に正解 → 自動的に次のレッスンへ遷移することを確認（章をまたぐ場合も含む）
  - コース最後のレッスン（7章4レッスン目）まで到達すると「次へ」が無効化されることを確認
  - 「答えを見る」で模範解答が表示されることを確認
  - JavaScriptコース（既存の拡張性検証用コース）が今回の共通コンポーネント変更後も
    問題なく動作することを確認（リグレッションなし）
  - コース詳細ページで7章・26レッスンの一覧とステータス（未着手/学習中/完了）を確認
  - ブラウザコンソールエラー: **0件**（`<img>`のダミーsrcによる想定内の404を除く）
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

---

## 2026-07-26: コースラインナップ拡充 ①JavaScript基礎コース本格拡充

HTML/CSSコース（7章26レッスン）・JavaScriptコース（拡張性検証用1レッスン）に続き、
Progateの主要コースを一通りカバーする方針のもと、JS→Python→SQLの順で1コースずつ
実装することをユーザーと合意。今回はJavaScriptコースを本格拡充した。

### 実施内容
拡張性検証用だった1レッスンを、5章15レッスンに全面刷新した。

| 章 | トピック | レッスン数 |
|---|---|---|
| 1章：JavaScriptに触れてみよう | console.log、変数(let)、定数(const) | 3 |
| 2章：条件分岐をマスターしよう | if文、if-else、比較・論理演算子 | 3 |
| 3章：配列を使ってみよう | 配列の基本、push、length | 3 |
| 4章：繰り返し処理をしよう | for文、while文、forEach | 3 |
| 5章：関数を作ろう | 関数宣言、関数の使い回し、アロー関数 | 3 |

既存の`javascriptJudge.ts`（`checkType: "js-output-equals"`、postMessage方式）をそのまま
利用し、判定ロジックの変更は一切行っていない。教材はHTML/CSSコースと同じ
「説明→完成イメージ（コード実行結果のライブ表示）→演習」構成。

### 設計上の判断（無限ループのリスクについて）
`for`/`while`文を扱う演習を初めて追加するにあたり、ユーザーが`i++`を書き忘れる等で
無限ループを書いてしまうリスクを検討した。既存のiframe+eval方式（ユーザー指示により
そのまま再利用）は、JavaScriptの単一スレッド特性上、実行中の同期的な無限ループを
外部から安全に停止する手段がなく、これはWeb Worker化などの大きな設計変更なしには
技術的に解消できない制約であることをユーザーに事前共有した上で、下記の方針で対応した。
- ループ回数を1〜5程度の小さい範囲に抑えた演習設計にする
- 「よくある間違い」に無限ループの注意書きを明記する（特に`while`文レッスン）
- 最終的な安全網はブラウザ標準の「応答なし」保護に委ねる（Progateなど他の
  ブラウザ内コード実行サービスも同様の制約を抱える）

### 変更・作成したファイル
- 変更: `content/javascript/course.json`（1章1レッスン→5章15レッスン構成に全面刷新）
- 新規: `content/javascript/lessons/js1-01〜js5-03-*.json`（15ファイル）
- 削除: 旧`content/javascript/lessons/01-console-log.json`（新構成に統合）
- 判定ロジック(`src/lib/judge/javascriptJudge.ts`)・共通コンポーネントへの変更は無し

### 動作確認結果
- 全JSONファイルを`python3 -m json.tool`で構文チェック → 全て正常
- **教材の自動検証**: 全15レッスン・15演習について、Playwrightで各`solutionCode`を
  実際にブラウザ（iframeサンドボックス相当の環境）で実行し、`judgeJavaScriptOutput`が
  `correct: true`を返すことを自動チェック → **全問正解を確認**
- `npm run lint` / `npm run build` → いずれも成功
- **実ブラウザでの動作確認**（Playwright + Chromium）:
  - コース詳細ページで5章すべてが表示されることを確認
  - `for`文レッスンで1〜5を出力する演習を実行 → フリーズせず正常に正誤判定され、
    次のレッスン(`while`文)へ自動遷移することを確認（無限ループリスクへの対処が
    小さいループ範囲内で問題なく機能することを確認）
  - サイドバーのタブ表示が`index.html`ではなく`script.js`になっていることを確認
    （既存実装のコース言語判定がそのまま機能）
  - ブラウザコンソールエラー: **0件**
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

### 次回やること（②Python基礎コース新規追加）
- Pyodide導入方針・判定ロジック（標準出力/変数値判定）をユーザーに提示し確認を得てから着手する

---

## 2026-07-26: コースラインナップ拡充 ②Python基礎コース新規追加（Pyodide導入）

### 実装前の技術検証
設計を確定する前に、Playwrightで以下を実機検証した。
- `sandbox="allow-scripts"`（allow-same-originなし）のiframe内でも、jsdelivr CDN
  （`Access-Control-Allow-Origin: *`）からPyodideをロード・実行・postMessage通信できること
  → 実測ロード時間は約2.3秒
- Pyodideのバージョンが`0.29.x`系から`314.x`系（CPythonのバージョンに合わせた命名規則と
  推測される）に変わっていたが、2026年6月から約6週間安定運用されている正式リリースである
  ことを確認し、最新の`v314.0.3`を採用
- 変数値の型変換（`bool→boolean`, `float/int→number`, `str→string`）が正しく行われること
- `pyodide.runPython(code, { globals: namespace })`で毎回新しい空の名前空間を使うことで、
  実行間で変数が残留しないこと（`globals.clear()`は組み込みも消してしまうリスクがあるため
  不採用とし、`pyodide.toPy({})`による分離された名前空間を採用）

これらを踏まえた設計方針（CDN配布 vs 自己ホスティング）をユーザーに提示し、CDN配布での実装に
合意を得た上で着手した。

### 実施内容

**実行環境: Pyodide (CDN配布)**
- `@codemirror/lang-python`を追加（エディタのシンタックスハイライト用）
- `src/lib/judge/pythonJudge.ts`を新規作成
  - `buildPythonRunnerHtml()`: srcDocが固定の「常駐ランナー」。レッスン表示中に1回だけ
    Pyodideを読み込み、以後は親からの`postMessage`でコードを受け取って実行する
    （HTML/CSS・JSコースのように毎回iframeを作り直す方式は、Pyodideの初回ロードコストが
    大きいため採用できないと判断した）
  - `judgePythonOutput()`: `python-output-equals`（print出力の判定）と
    `python-variable-equals`（実行後の変数値を直接判定）の2種類のcheckTypeに対応

**実行モデルの違い（ユーザーに事前説明した通りの設計変更）**
- レッスンを開くと同時にPyodideの読み込みを開始し、プレビュー内に
  「Pythonの実行環境を読み込み中...」→「準備ができました」を表示（ローディングUX）
- コード変更のたびに自動実行するのではなく、「実行してみる」（説明・完成イメージスライド）
  「実行して確認する」（演習スライド）ボタンを押したときだけ実行
- Pyodideの読み込みが終わるまで「実行して確認する」ボタンをdisabledにし、
  「実行環境を準備中です…」を表示（`ResultChecker`に`checkDisabled`propsを追加）

**教材構成（5章15レッスン）**: print、変数・型、if/elif/else、リスト、for文（`range()`と
リストの繰り返し、集計処理）、関数（定義・再利用・デフォルト引数）。JSコースと同様、
`while`文は扱わず`for ... in range()`中心の構成にすることで、無限ループのリスクを
構造的に避けた（Pyodideも単一スレッドで動作するため、無限ループを外部から止める手段がない
制約はJSコースと同じ）。

### 実装中に発見・修正した不具合（2件）
実ブラウザでの動作確認中に、ドキュメント化されていない重大な不具合を2件発見し修正した。

1. **Pyodide準備完了通知のレースコンディション**: iframeの`srcDoc`はページのSSR済みHTMLに
   直接埋め込まれるため、ブラウザがReactのhydrationを終えるより先にiframe内でPyodideの
   読み込みを開始・完了してしまうことがあった。1回きりの`postMessage`通知だと、Reactの
   `useEffect`がリスナーを登録する前に通知が届いて取りこぼされ、「実行して確認する」が
   永久にdisabledのままになる不具合があった。→ 準備完了通知を250ms間隔で最大20回
   繰り返し送信するように修正（親側の処理は何度届いても同じ状態にするだけなので副作用はない）。
   あわせて、メッセージリスナーの`useEffect`が`slideIndex`等に依存し、スライド送りのたびに
   再購読される作りになっていた点も、`latestSlideStateRef`経由で最新値を参照する方式に
   直して、レッスン表示中はリスナーを張りっぱなしにするよう修正した。
2. **`namespace.keys()`の扱いの誤り**: PyodideのPyProxyの`.keys()`はイテレータを返すが、
   実装では配列であるかのように`keys.length`でループ回数を判定するコードになっており、
   `length`が`undefined`のため条件`i < keys.length`が常に偽となり、変数の中身を
   一切拾えていなかった（`python-variable-equals`の判定が常に「変数が定義されていません」
   になる不具合）。→ `for...of`で走査するように修正。
   （教訓: QA用の検証スクリプトは実装コードを再現するのではなく、実装コード自体を
   検証する必要がある。今回は独自に書いたQAスクリプトが偶然正しい実装だったため、
   実装側の同種のバグを自動検証だけでは検出できず、実ブラウザでの手動確認で見つかった）

### 副次的に見つかった教材上の注意点
CodeMirrorのPython言語モードは自動でインデントを継続する機能があり、関数やforループの
本体を書いた後、空行を挟んでインデントなしの行（関数の外の処理）を書こうとすると、
意図せず字下げされたままになりPythonの`IndentationError`やロジックの誤りにつながることが
判明した。該当するレッスン（`py4-03-for-sum`, `py5-01〜03`）の「よくある間違い」に
注意書きを追加した。

### 変更・作成したファイル
- 新規: `src/lib/judge/pythonJudge.ts`
- 新規: `content/python/course.json`, `content/python/lessons/py1-01〜py5-03-*.json`（15ファイル）
- 変更: `src/types/lesson.ts`（checkTypeに`python-output-equals`/`python-variable-equals`追加）
- 変更: `src/components/PreviewPane.tsx`（python分岐、sandboxはallow-scripts）
- 変更: `src/components/CodeEditor.tsx`（`@codemirror/lang-python`追加）
- 変更: `src/components/LessonWorkspace.tsx`（Pyodideの読み込み状態管理、
  postMessageでの実行トリガー、レースコンディション修正）
- 変更: `src/components/ResultChecker.tsx`（`checkDisabled`props追加）
- 変更: `package.json` / `package-lock.json`（`@codemirror/lang-python`追加）

### 動作確認結果
- 全JSONファイルを`python3 -m json.tool`で構文チェック → 全て正常
- `npm run lint` / `npm run build` → いずれも成功
- **教材の自動検証**: 全15レッスン・15演習について、Pyodideを1回ロードし各演習を
  分離された名前空間で実行するPlaywrightスクリプトで、`solutionCode`が
  `judgePythonOutput`相当のロジックで`correct: true`になることを確認
  → **全問正解を確認**
- **実ブラウザでの動作確認**（Playwright + Chromium）:
  - トップページにPython基礎コースのカードが自動的に表示されることを確認
    （`contentLoader`・API・一覧/詳細ページのコードは無変更のまま拡張性を再確認）
  - コース詳細ページで5章すべてが表示されることを確認
  - ローディング表示（「読み込み中...」→「準備ができました」）を確認
  - 「実行してみる」ボタン（完成イメージスライド）でPythonコードを実行し、出力が
    プレビューに表示されることを確認
  - `python-output-equals`（print判定）・`python-variable-equals`（変数値判定）の
    両方の判定方式が正しく動作することを確認
  - リスト・for文（`range()`）・関数（デフォルト引数含む）の演習が正しく判定されることを確認
  - レッスン最後の演習に正解 → 次のレッスンへ自動遷移することを確認
  - HTML/CSSコース・JavaScriptコースが今回の`LessonWorkspace`/`ResultChecker`等の
    共通コンポーネント変更後も問題なく動作することを確認（リグレッションなし）
  - トップページに3コース（HTML/CSS・JavaScript・Python）が表示されることを確認
  - ブラウザコンソールエラー: **0件**
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

### 次回やること（③SQL基礎コース新規追加）
- sql.js導入方針・判定ロジック（クエリ結果の判定）をユーザーに提示し確認を得てから着手する

---

## 2026-07-27: コースラインナップ拡充 ③SQL基礎コース新規追加（sql.js導入）

### 実装前の技術検証
- `sandbox="allow-scripts"`のiframe内でsql.js(jsdelivr CDN、`v1.14.1`)をロード・実行できることを
  Playwrightで確認。ロード時間は実測約290ms（Pyodideの約2.3秒よりかなり軽量）
- 同じCREATE TABLE/INSERTを与えた複数の新規`Database`インスタンスに対して、JOINや
  GROUP BYを含むクエリを3回実行し、結果の行順が毎回完全に一致すること（決定的であること）を
  確認した上で、`columns`/`rows`の完全一致判定を採用する設計に決めた
- 今回はPythonコースで得た教訓（QAスクリプトが実装を再現するのではなく、実装コードそのものを
  検証すべき）を踏まえ、自動検証は`sqlJudge.ts`の`buildSqlRunnerHtml`/`judgeSqlResult`を
  実際にimportして使う方式にした

これらを踏まえた設計方針（5章15レッスン、users+postsテーブル、sql-result-equals判定）を
ユーザーに提示し合意を得た上で着手した。

### 実施内容

**実行環境: sql.js (CDN配布)**
- `@codemirror/lang-sql`を追加（エディタのシンタックスハイライト用）
- `src/lib/judge/sqlJudge.ts`を新規作成
  - `buildSqlRunnerHtml()`: Python同様の常駐ランナー。コース全体で共通のサンプル
    データベース（`users`: id/name/age/city、`posts`: id/user_id/title/likes、
    それぞれ5件）のCREATE/INSERT文を埋め込み、実行のたびに新しい`Database`を作って
    そのSQLを流し込んでからユーザーのクエリを実行する（誤ってUPDATE/DELETEを
    書いても次の実行に影響しない設計）。結果はプレビュー内にHTMLテーブルとして
    整形して表示する
  - `judgeSqlResult()`: `sql-result-equals`（実行結果の`columns`/`rows`を
    期待値と完全一致で比較）
- Python導入時に発見した2つの不具合（準備完了通知のレースコンディション、
  イテレータをlengthで扱う誤り）を教訓に、`buildSqlRunnerHtml`は最初から
  「準備完了通知を250ms間隔で最大20回リトライ送信」する設計で実装した
  （同じ不具合を再発させない）

**LessonWorkspaceのリファクタリング**
Python導入時に追加した「常駐ランナー方式（読み込み待ち→postMessageで実行→
判定）」のロジックを、SQLでもほぼ全く同じ形で必要としたため、
`ASYNC_RUNNER_LANGUAGES`という言語→メッセージ種別・判定関数の対応表を導入し、
Python専用だった状態管理・メッセージリスナー・実行トリガーの関数を
Python/SQL共通のロジックに一本化した（`pyodideReady`→`asyncRunnerReady`、
`handleRunPython`→`handleRunAsync`など）。JavaScriptコースは引き続き別ロジック
（コード変更のたびに自動実行し、Stateに結果を保持しておく方式）のまま。

**教材構成（5章15レッスン）**: SELECT基本、WHERE（比較演算子・AND/OR）、
ORDER BY/DESC/LIMIT、集計（COUNT/GROUP BY/SUM・AVG）、JOIN（基本・WHERE併用・
ORDER BY併用の総仕上げ）。全レッスンで共通のusers/postsサンプルデータを使い、
章が進むごとに同じデータへの理解が深まる構成にした。

### 動作確認結果
- 全JSONファイルを`python3 -m json.tool`で構文チェック → 全て正常
- `npm run lint` / `npm run build` → いずれも成功
- **教材の自動検証**: 実装コードの`buildSqlRunnerHtml`/`judgeSqlResult`を
  直接importして使うPlaywrightスクリプトで、全15レッスン・15演習の
  `solutionCode`が`correct: true`になることを確認 → **全問正解を確認**
- **実ブラウザでの動作確認**（Playwright + Chromium）:
  - トップページにSQL基礎コースのカードが自動的に表示されることを確認
    （`contentLoader`・API・一覧/詳細ページのコードは無変更のまま拡張性を再確認）
  - コース詳細ページで5章すべてが表示されることを確認
  - 「実行してみる」ボタンでSELECT文を実行し、結果がHTMLテーブルとして
    プレビューに表示されることを確認
  - 複数行にまたがるJOIN文をキーボード入力で正しく判定できることを確認
    （PythonのCodeMirror自動インデント問題のような不具合がないことを確認）
  - GROUP BY・JOIN・JOIN+ORDER BY（5章の総仕上げレッスン）が正しく判定されることを確認
  - 不正解パターン（該当しない条件のクエリ）が正しく不正解と判定されることを確認
  - レッスン最後の演習に正解 → 次のレッスンへ自動遷移することを確認
  - HTML/CSS・JavaScript・Pythonコースが今回の`LessonWorkspace`リファクタリング後も
    問題なく動作することを確認（リグレッションなし）
  - トップページに4コース（HTML/CSS・JavaScript・Python・SQL）が表示されることを確認
  - ブラウザコンソールエラー: **0件**
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

### コースラインナップ拡充（①②③）まとめ
これで設計書が将来拡張として想定していたJavaScript・Python・SQLの3コースが、
既存のcontent/JSON + judgeロジックのアーキテクチャに沿って実装できた。
4コース・71レッスン（HTML/CSS 26、JavaScript 15、Python 15、SQL 15）が
`content/`配下へのJSON追加のみで動作し、`contentLoader`・API・コース一覧/詳細
ページのコードは初回実装（ステップ2〜3）から一度も変更しておらず、設計書が
意図した拡張性を3コース分の追加を通じて実証できた。

### 今回のスコープ外（次回以降に検討）
- 章末レビュー問題・復習機能（別途依頼予定とのこと）
- Ruby/PHP/Javaなどサーバー実行が必要な言語

---

## 2026-07-28: 進捗保存・復元機能の見直し（調査 → 段階1: 再開位置の不具合修正＋復元）

### 調査で判明した重大な不具合
実装前にユーザー依頼で現状調査を行い、実ブラウザ（Playwright）とDBの実測により、
**設計書5.1の仕様が実質的に機能していない**ことが判明した。

設計書5.1には「学習の再開位置（`currentSlide`）まで保存することで、Progateのように
『途中から再開』できるようにする」と明記されているが、実際には:
1. 保存された`currentSlide`が**どこからも読み戻されていなかった**
   （`LessonWorkspace`は常に`useState(0)`で開始。`getLessonProgressMap()`は
   `currentSlide`を返していたが、消費側は`status`しか使っていなかった）
2. さらに、レッスンを開くたびにマウント時POSTが無条件に`currentSlide: 0`を送るため、
   **保存済みの再開位置が開くたびに0で上書き破壊されていた**

実測ログ（修正前）:
```
[リロード前] スライド位置: 3 / 3, エディタ: "<h1>書きかけの</h1>"
[リロード後] スライド位置: 1 / 3, エディタ: ""      ← 位置もコードも失われる
リロード後のDB: currentSlide=0                     ← 保存値まで破壊される
```
つまり`currentSlide`カラムは書き込まれるだけの実質デッドデータだった。
あわせて設計書6.1の「続きから」ボタンも未実装であることを確認した。

### 調査結果（保存タイミングの一覧）
POSTは`LessonWorkspace.tsx`の4箇所のみ。保存対象は`currentSlide`と`status`の2つだけで、
**コード入力では一切POSTされない**（実測で確認）。離脱時（リロード/タブを閉じる/
ブラウザバック/別レッスンへ移動）の保存処理は未実装で、書きかけコードは常に失われる。

### 今後の進め方（ユーザーと合意）
調査結果をもとに案A（最小修正）/案B（Progate相当UX）/案C（ポートフォリオ最大化）を
比較提示し、**案Cへ段階的に進める**方針で合意した。
- 段階1: 再開位置の不具合修正＋復元 ← 今回
- 段階2: 書きかけコードの保存・復元＋離脱時保存
- 段階3: 学習イベント記録（学習時間・試行回数の基盤）
※段階2完了時に一度立ち止まり、段階3へ進むか「完了一覧・ポートフォリオ画面」を
先に実装するかを再相談する。

### 段階1の実施内容
- `src/components/LessonWorkspace.tsx`: `initialSlideIndex` propsを追加し、
  開始スライド・初期コードの決定に使用。**マウント時POSTも`0`固定から
  `initialSlideIndex`に変更**（上書き破壊の修正）
- `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`: 保存済み`currentSlide`を
  読み出して渡す。教材JSONを編集してスライドが減っている場合に備え`Math.min`で
  範囲内に収める。**完了済みレッスンは先頭から表示**（完了後に開き直すのは
  「再開」ではなく復習のため。学習途中のレッスンだけ再開位置から開く）
- `src/lib/progress.ts`: `CourseProgressSummary`に`lastStudiedLessonId`を追加。
  `LessonProgress`を`updatedAt`降順で取得し、コースごとに最初の1件を
  「最後に学習したレッスン」とする（DB変更不要で実現）
- `src/components/CourseCard.tsx`: 「続きから」ボタンを追加（設計書6.1の未実装分）。
  カード全体が`<Link>`だったため、**リンクの入れ子（不正なHTML）を避けて**
  カード本体リンクと兄弟要素になるよう構造を組み替えた
- `src/app/page.tsx`: 上記フィールドの受け渡し

**DBスキーマ変更なし**（既存の`currentSlide`/`updatedAt`を使うのみ、マイグレーション不要）。
**APIのリクエスト形式変更なし**（`GET /api/progress`のレスポンスに
`lastStudiedLessonId`が加わる後方互換の追加のみ）。教材JSON・judgeロジックへの影響なし。

### 動作確認結果
- `npm run lint` / `npm run build` → いずれも成功
- **実ブラウザでの確認**（Playwright + Chromium、調査時と同一シナリオを再実行）:
  - リロード: `3 / 3` → リロード後も `3 / 3`（修正前は`1 / 3`に戻っていた）
  - 別レッスンへ移動して戻る: `3 / 3` で復元
  - タブを閉じて開き直す: `3 / 3` で復元
  - 完了済みレッスンを開き直す: 先頭(`1 / 4`)から表示（意図通りの復習モード）
  - 「続きから」ボタン: トップページに表示され、`href`が
    `/courses/html-css/lessons/ch1-02-headings-paragraphs`（最後に学習したレッスン）
    となり、クリックで正しく遷移することを確認
  - DB実測: `ch1-01-html-structure`が`currentSlide=2`のまま保持される
    （修正前は開くたびに`0`へ破壊されていた）
  - **4コース共通基盤の回帰確認**: HTML/CSS・JavaScript・Python・SQLすべてで
    正解判定が動作し、JS・Python・SQLでもリロード後に再開位置が復元されることを確認
  - ブラウザコンソールエラー: **0件**
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

### 補足（ドキュメントの配置について）
`CLAUDE.md`内に`docs/CLAUDE.md`という記載があったが、正しい配置は
**リポジトリルート直下の`CLAUDE.md`**であるとユーザーに確認した。今後の参照・記載は
ルート直下に統一する。

### 次回やること（段階2: 書きかけコードの保存・復元＋離脱時保存）
- `LessonProgress`に書きかけコードを保存するカラムを追加（DBスキーマ変更あり）
- スライド単位でコードを保持し、リロード・離脱後も復元できるようにする
- `visibilitychange`/`pagehide` + `sendBeacon`で、タブを閉じる・バックした際も保存する
- 実装前に変更ファイル一覧・DB/API変更の有無を提示する

---

## 2026-07-28: 段階2 書きかけコードの保存・復元＋離脱時保存

### 実装前の技術検証（sendBeaconのContent-Type問題）
`navigator.sendBeacon`は`Content-Type`を自由に設定できないため、既存の`request.json()`を
使うAPIルートで正しくパースできるか懸念があった。Pythonコース実装時の教訓
（憶測で進めず実装コードを実機検証する）に従い、**実装を確定する前に実測**した。

結果: `new Blob([payload], { type: "application/json" })`を渡せば`Content-Type: application/json`
として送信され、既存APIが200を返し、**DBにも正しく書き込まれる**ことを確認
（テスト用に`currentSlide: 7`を送り、DBに反映されることを確認）。
このためAPIルート側の追加対応は不要と判断した。

### DBスキーマ変更
`LessonProgress`に`draftCode String?`を追加。
マイグレーション: `20260727184129_add_draft_code_to_lesson_progress`

**「1レッスン1カラム」を選んだ理由**: `draftCode`は常に`currentSlide`と同一のPOSTで
保存するため両者は必ず整合し、「保存された`currentSlide`に再開するときだけ、その
`draftCode`を使う」というルールで足りる。スライドごとにJSONで持つ案も検討したが、
現状の実装はスライド移動時に初期コードへリセットする仕様であり、履歴を持つのは
仕様変更にあたるためYAGNI方針で見送った。1カラムのほうが今後の統計処理でも扱いやすい。

### 実装中に気づいて回避した不整合
当初、サーバー側で「`draftCode`が送られてこなければ既存の下書きを保持する」実装に
していたが、これだと**スライド移動時に旧スライドの下書きが残り、復元時に別スライドの
コードが表示される**不整合が起きることに気づいた。そこで
「`draftCode`は必ず`currentSlide`とセットで送る」という不変条件をクライアント側で徹底し
（`reportProgress`の引数を必須化）、サーバー側は送られてこなければ消す単純な実装にした。
さらにサーバー側でも、保存時のスライドと開く位置が一致する場合のみ復元するようにして
二重に守っている（完了済みで先頭に戻す時や、教材のスライドが減った時に誤復元しない）。

### 実施内容
- `prisma/schema.prisma` + マイグレーション: `draftCode`カラム追加
- `src/hooks/useDraftAutoSave.ts`（**新規ディレクトリ`src/hooks/`**）:
  自動保存フック。①入力停止から1秒後のデバウンス保存（`fetch`）と、
  ②`visibilitychange`(hidden時)・`pagehide`での`sendBeacon`保存の2系統。
  ②だけではブラウザ強制終了時などに失われ、①だけでは離脱に間に合わないため併用。
  `beforeunload`は確認ダイアログの誤用やモバイルでの不発を避けるため使わない
- `src/lib/lessonCode.ts`（新規）: スライドの初期コードを求める`defaultCodeForSlide`を
  切り出し、学習画面（クライアント）と復元処理（サーバー）の両方から使えるようにした
- `src/lib/progress.ts`: `draftCode`の保存・読み出しに対応
- `src/app/api/progress/route.ts`: POSTで`draftCode`（任意・文字列）を受け付け
- `src/components/LessonWorkspace.tsx`: `initialCode` propsで復元、自動保存フックを組み込み、
  全`reportProgress`呼び出しで`draftCode`を必須送信に変更
- `src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`: 保存済み下書きを復元して渡す
- `CLAUDE.md`: ディレクトリ構成を実態に合わせて更新（`src/hooks/`の追加、
  実際に存在するlib/componentsファイルの反映）。あわせてコンポーネント設計ルールに
  「Reactロジックは`src/hooks/`、純粋なロジックは`src/lib/`」の方針を追記

**API変更**: `POST /api/progress`のボディに`draftCode?: string`が加わるのみ（任意項目、後方互換）。
GETは変更なし。教材JSON・judgeロジックへの影響なし。

### 動作確認結果
- `npm run lint` / `npm run build` → いずれも成功
- **実ブラウザでの確認**（Playwright + Chromium）:
  - リロード: 書きかけコードとスライド位置の両方が復元されることを確認
  - **タブを閉じる**: デバウンス(1秒)が走る前に閉じても、`sendBeacon`により保存され、
    開き直すと復元されることを確認
  - **別ページへ移動**: 同じくデバウンス前に離脱しても保存・復元されることを確認
  - **スライド移動時の混入なし**: 1つ前のスライドへ戻ると、そのスライドの初期コードが
    表示され（前スライドの下書きが混入しない）、その状態でリロードしても正しく
    保たれることを確認
  - **完了済みレッスン**: 先頭スライドかつ初期コードで開き、完了時の下書きが
    復元されないことを確認
  - DB実測: `draftCode`が`currentSlide`と整合して保存されていることを確認
  - **4コース共通基盤の回帰確認**: HTML/CSS・JavaScript・Python・SQLすべてで
    正解判定が正常動作
  - ブラウザコンソールエラー: **0件**
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

### 動作確認時の補足（テストスクリプト側の事象）
検証中、テストが2回失敗したが、いずれも**再開機能が正しく動いた結果**だった。
テストが「常にスライド0から始まる」前提で「次へ」を押そうとしたのに対し、実際には
保存位置（最終スライド）で再開したためボタン名が「次のレッスンへ」に変わっていた。
テスト側を現在位置に依存しない実装に修正して再実行し、全項目パスした。
また、macOS環境では`Control+A`が全選択にならないため、検証ログ上でコードが
累積して見える箇所があるが、これはテストスクリプトの入力方法によるもので
アプリの不具合ではない（新規入力分が確実に永続化・復元されることは確認済み）。

### 次回やること（段階3 or 完了一覧・ポートフォリオ画面）
ユーザーの依頼により、**段階2完了時点で一度立ち止まり**、
- 段階3（学習イベント記録: 学習時間・試行回数の基盤）へ進むか
- 先に「完了一覧・ポートフォリオ画面」の実装へ進むか
を相談してから着手する。

---

## 2026-07-28: 学習ダッシュボード（完了一覧・ポートフォリオ画面）

段階2完了後の相談の結果、ユーザーの判断で**先に画面を作り、実際に見てから
「本当に必要な指標は何か」を見極めて段階3を設計する**方針となった。

### 実装前に整理した「出せる指標／出せない指標」
この画面は設計書に記載のない新規追加のため、CLAUDE.mdの方針に従い構成を提示し
承認を得てから着手した。その際、**現状のデータで正確に出せる指標だけを扱う**ことを
提案し、合意を得た（不正確な数字を出すとポートフォリオとしての信頼性を損なうため）。

| 指標 | 可否 | 根拠 |
|---|---|---|
| 完了レッスン数・完了率・コース別進捗 | ✅ 正確 | `status = completed` の件数 |
| 完了日時・完了履歴 | ✅ 正確 | `completedAt` は完了時に一度だけ記録される |
| 最終学習日 | ✅ 正確 | `updatedAt` の最大値 |
| 「学習した日数」 | ⚠️ 不正確 | `updatedAt`は上書きされ履歴が残らないため、「開いただけの日」は追えない |
| 解いた演習数 | ⚠️ 不正確 | 演習は「次へ」で飛ばせるため、完了レッスンの演習数を数えると実際より多くなる |
| 学習時間・試行回数・正解率 | ❌ 不可 | 記録していない（段階3の対象） |

⚠️と❌は**今回表示しない**方針とした。

### 画面構成（`/dashboard`「学習ダッシュボード」）
1. **サマリー**: 完了レッスン(4/71)・全体の進捗(%)・着手コース(n/4)・最終学習日
2. **コース別の進捗**: 4コースの進捗バーと完了数、「続きから」（未着手なら「始める」）
3. **完了したレッスン**: 完了日でグルーピングした新しい順の一覧

### 変更・作成したファイル
- 新規: `src/app/dashboard/page.tsx`（Server Component）
- 新規: `src/lib/statistics.ts`（集計ロジック。`progress.ts`は保存/取得の責務なので分離）
- 新規: `src/components/StatCard.tsx`、`src/components/CompletedLessonList.tsx`
- 変更: `src/app/page.tsx`（ダッシュボードへの導線を追加）
- 変更: `CLAUDE.md`（ディレクトリ構成に追記）

**DBスキーマ変更なし**（マイグレーション不要）。**API変更なし**。
APIを新設しなかったのは既存方針との一貫性のため（ステップ6で「Server Componentが
自分自身のAPI Routeをfetchするのは不要なネットワークホップ」と判断済みで、
ページから`lib`の関数を直接呼ぶ形に揃えた）。

### 実装上の判断
- 教材から削除されたレッスンの進捗記録が残っていても、完了一覧には出さない
  （`getLessonSequence`に存在するレッスンのみ表示）。教材JSONは手編集するため、
  存在しないレッスン名が履歴に残ると混乱するため
- 未着手コースは「始める →」、着手済みは「続きから →」を出し分け、
  どの状態でも次の行動が明確になるようにした

### 動作確認結果
- `npm run lint` / `npm run build` → いずれも成功（`/dashboard`ルートを認識）
- **実ブラウザでの確認**（Playwright + Chromium）:
  - **空状態**: 「0 / 71」「0%」「0 / 4」「—（まだ学習の記録がありません）」と表示され、
    完了一覧は「まだ完了したレッスンはありません」、各コースは「始める →」になることを確認
  - **データがある状態**: 4コースで1レッスンずつ完了させ、サマリーが
    `["4 / 71", "6%", "4 / 4", "2026/7/28"]`、コース別が各`1 / n レッスン完了`、
    完了一覧が4件・新しい順（SQL→Python→JavaScript→HTML/CSS）で日付グルーピング
    されることを確認
  - トップページの「学習ダッシュボード」導線から`/dashboard`へ遷移できることを確認
  - **ダークモード**でも既存のデザイントークンで正しく表示されることを確認
  - ブラウザコンソールエラー: **0件**（ライト・ダークとも）
  - 検証で作成したテスト用進捗データはコミット前にクリア済み

### 次回やること（段階3の設計相談）
実際にダッシュボードを見た上で、どの指標が本当に必要かを見極めてから、
学習イベント記録（学習時間・試行回数など）の設計を改めて相談する。

---

## 2026-07-28: 段階3 学習時間・連続学習日数（ストリーク）

ユーザーの判断で、試行回数・正解率はモチベーション低下の懸念から対象外とし、
**学習時間**と**連続学習日数**のみを実装した。

### 設計前に発見した重大な罠（日付のUTCずれ）
設計を確定する前に、Prisma+SQLiteでの日時の扱いを実測したところ、
**同じ「7/28 01:00(JST)」がSQL側では 7/27 として集計される**ことが判明した。

| 取り出し方 | 「7/28 01:00 JST」の日付 |
|---|---|
| JS側（`Date.getDate()`） | 7月28日（正しい） |
| SQL側（`date()` / `GROUP BY`） | **7月27日（1日ずれる）** |

連続学習日数は日付の正確さが命のため、**日付は`DateTime`ではなく
`"YYYY-MM-DD"`の文字列で保存**し、日付の確定はJS側（ローカルTZ）で行う設計にした。

### ユーザーと合意した設計方針
| 項目 | 採用案 |
|---|---|
| 学習時間の計測 | 区間積算＋60秒ごとのフラッシュ（可視時間のみ加算） |
| 離席対策 | 最後の操作から10分無操作で計測を打ち切り |
| ストリーク判定 | その日に**1問でも正解**したら成立 |
| DB設計 | 新規`StudyDay`テーブルのみ（既存テーブルは変更なし） |

### DBスキーマ変更
```prisma
model StudyDay {
  id             Int     @id @default(autoincrement())
  date           String  @unique   // "YYYY-MM-DD"（UTCずれ回避のため文字列）
  studySeconds   Int     @default(0)
  solvedExercise Boolean @default(false)
}
```
マイグレーション: `20260728060800_add_study_day`

### API変更
**新規`POST /api/study-time`**（学習時間の「加算」と学習実績の記録）。
既存の`/api/progress`は「上書き」の意味を持つため、意味が曖昧にならないよう分離した。
既存APIへの変更はなし。

### 実装中の判断（当初案からの変更）
計画段階では「1区間の上限30分」も設ける想定だったが、実装しながら整理した結果、
**離席判定（最後の操作から10分）によって1回の送信で加算されうる時間は最大でも
10分に収まる**（スリープからの復帰時も同様）ため、30分の上限は到達し得ない
デッドコードになると判断し、実装しなかった。CLAUDE.mdの「存在しないエラーケースへの
防御的な実装は書かない」方針に従った。この判断は実測（下記検証C）でも裏付けられている。

### 変更・作成したファイル
- 新規: `prisma/migrations/20260728060800_add_study_day/`
- 新規: `src/lib/dateKey.ts`（日付の文字列化。クライアント/サーバー双方から使うため、
  DBに依存しない純粋関数として分離）
- 新規: `src/lib/studyTime.ts`（学習時間の加算・ストリーク計算。`statistics.ts`は
  ダッシュボードの集計が責務のため分離した）
- 新規: `src/hooks/useStudyTimeTracker.ts`（可視時間の計測・60秒フラッシュ・離脱時送信）
- 新規: `src/app/api/study-time/route.ts`
- 新規: `src/components/StreakBadges.tsx`
- 変更: `prisma/schema.prisma`、`src/lib/statistics.ts`、
  `src/components/LessonWorkspace.tsx`（計測フックの組み込み・正解時の記録）、
  `src/app/dashboard/page.tsx`（サマリー4枚→6枚、バッジ、注記）、`CLAUDE.md`

※計画時の提示（新規4ファイル）に対し、`dateKey.ts`と`studyTime.ts`の2ファイルを
追加した。前者はクライアント・サーバー双方から使う必要があり（`studyTime.ts`は
prismaをimportするためクライアントから読めない）、後者は集計と記録の責務を
分けるためで、いずれも実装しながら必要と判断したもの。

### 動作確認結果（すべて実測）
- `npm run lint` / `npm run build` → いずれも成功（`/api/study-time`を認識）
- **ストリーク計算**: 実装コード(`calculateStreaks`)を直接importし、8ケースを検証
  → **全ケース一致**（記録なし／今日だけ／3日連続／昨日まで連続（継続中扱い）／
  途切れ（現在0・最長は保持）／途切れ後の再開／飛び飛び／順序バラバラ）
- **日付ずれ**: Playwrightの`clock.install`でブラウザ時計を**深夜1時(JST)**に固定して
  検証 → 送信・保存とも`2026-07-28`（UTCなら07-27になるところ）。**ずれなしを確認**
- **タブ非表示中の非加算**: 非表示にして10分進める → 加算**0秒**
- **アイドル停止**: 見えたまま無操作で**20分**進める → **599秒**で打ち切り
  （1200秒にはならない）。上限が機能することを実測で確認
- **正常計測**: 操作しながら5分進める → **301秒**（ほぼ実時間通り）
- **4コース動作**: HTML/CSS・JavaScript・Python・SQLすべてで、正解時に学習実績が
  記録されることを確認
- **ダッシュボード表示**: 「学習時間（目安）14分＋注記」「🔥1日／最長1日」
  「バッジ4種（未達成は🔒）」を確認。8日連続のデータを投入した状態では
  「🔥8日」「🏅3日連続・🏅7日連続が達成、14日・30日は未達成」と正しく計算される
  ことを確認
- ブラウザコンソールエラー: **0件**
- 検証で作成したテスト用データ（進捗・学習日）はコミット前にすべてクリア済み

### 検証時の補足
4コース確認で最初HTML/CSSのみ記録されなかったが、原因はテストスクリプトが
最終スライド（`<p>`タグが必要）に対して1つ前のスライドの解答を入力していたため
だった。正しい解答で再実行し、記録されることを確認済み（アプリの不具合ではない）。

---

## 2026-07-29: UI全面刷新（デザイントークンの再設計）

「Tailwindのデフォルト的な均一なカード・単調な余白で、初心者が作ったように見える」
という課題に対し、配色の塗り替えではなく**設計そのもの**を見直した。
参考資料は `docs/design.md`（ダーク）と `docs/design-light.md`（ライト）。
※両ファイルは外部サービスによる独自分析であり、両社の公式デザインではないため、
ロゴ・商標・固有の文言は一切使用せず、配色・タイポグラフィ・構造の考え方のみを参考にした。

### 設計の骨子
**構造は両モード共通、配色だけモード別**という方針で統一した。

- **面の階調（4段）**: `canvas → surface-1 → surface-2 → surface-3`。
  ライトは「白へ近づく＋影」、ダークは「明るくなる」で持ち上がりを表現しており、
  **明度の方向は逆でも意味は共通**。`.elevate-1` / `.elevate-2` として共通化した。
- **タイポグラフィの段差**: `.type-display / headline / card-title / body / body-sm /
  caption / eyebrow / metric` を定義。大きい文字ほど字送りを詰め（displayは-0.045em）、
  `eyebrow` だけ逆に広げて大文字にし「見出しではなく分類」であることを示した。
- **ホバー**: `.interactive`（滑らかな遷移）と `.lift-on-hover`（2px浮き上がり）を共通化。
  `prefers-reduced-motion` にも対応。
- **余白のリズム**: セクション間は罫線＋大きな余白、カード内部は詰める。
- **情報の主役**: 画面ごとに主役を1つ決めた（トップ=「続きから」パネル、
  コース詳細=「次のレッスン」パネル、学習画面=コードとプレビュー、
  ダッシュボード=学習時間とストリーク）。他は意図的に控えめにしている。

### ユーザーとの合意事項（実装中に確認）
1. **アクセントはラベンダーで両モード共通**（当初は資料に忠実にライト=黒だったが、
   ブランドカラーとしての一貫性を優先する判断をいただいた）。
   ただしライトの白地では同じ色を文字に使うとコントラストが4.5:1ぎりぎりになるため、
   **塗り用(`--accent` #5e6ad2)と文字用(`--link` #4a54b8)で明度を分けて** AAを確保した。
2. **角丸は8px**（Linear流）に統一。資料が「CTAをピル型にするな」(Linear)と
   「全ボタンをピル型に」(Mintlify)で正反対だったため、構造共通の方針に従い、
   ツール的なUIに合う8pxを採用した。

### 変更・作成したファイル
- 全面刷新: `src/app/globals.css`（トークン・タイポグラフィ・面の階調・ホバーを定義）
- 新規: `src/components/SiteHeader.tsx`（全画面共通ヘッダー。トップ・コース詳細・
  ダッシュボードで重複していたナビを1つにまとめた）
- 刷新: `src/app/page.tsx`、`src/app/courses/[courseId]/page.tsx`、
  `src/app/dashboard/page.tsx`、`src/app/courses/[courseId]/lessons/[lessonId]/page.tsx`
- 刷新: `CourseCard` / `LessonSidebar` / `SlidePanel` / `ResultChecker` /
  `LessonWorkspace` / `StatCard` / `CompletedLessonList`
- 変更: `src/lib/progress.ts`（`lastStudiedAt` を追加。トップページで「最後に学習した
  コース」を主役にするための読み取り専用の追加で、保存処理は変更していない）
- 変更: `CLAUDE.md`（デザインルールの節を追加、ディレクトリ構成を更新）

**フォントは既存のGeistのまま**（`docs/design.md` が代替として明記しており、
新規依存を増やさずに済むため）。**DBスキーマ変更なし・API変更なし**。

### 画面ごとの主な変更
| 画面 | 変更点 |
|---|---|
| トップ | ヒーロー（見出し＋説明）と「続きから」パネルを新設し主役化。コースカードは行動を促さない控えめな作りにして、全体進捗を大きな数値で見せる |
| コース詳細 | 「次のレッスン」パネルを主役化。レッスンをカードではなく**行リスト**にして、トップページとの視覚的なリズムの差を作った。章番号・進捗を併記 |
| 学習画面 | サイドバーをcanvasに沈め、コードとプレビューを主役に。エディタ/プレビューにタブ風ヘッダーを追加。ポイント欄・正誤フィードバックを左罫線付きに |
| ダッシュボード | 学習時間と連続日数を大きな数値で主役化。補助指標(4枚)は一段控えめに。コース別進捗を行リストに変更 |

### 動作確認結果
- `npm run lint` / `npm run build` → いずれも成功
- **ライト/ダーク両方のスクリーンショット**を全4画面で撮影し目視確認
  → **コンソールエラー0件**（全画面・両モード）
- **ホバーの実測**: カードが `transform: none → translateY(-2px)`、境界線が
  `#23252a → #34343a`、ボタン背景が `#5e6ad2 → #828fff` に変化することを確認
- **機能の回帰確認**: 4コース（HTML/CSS・JavaScript・Python・SQL）すべてで
  正解判定が動作。トップ→学習画面の遷移、各画面の表示も正常
- 検証で作成したサンプルデータはコミット前にクリア済み

### 動作確認時の補足
回帰確認でHTML/CSSのみ一度 `false` になったが、テストスクリプトが最終スライド
（`border-radius` も必要）に対して1つ前のスライドの解答を入力していたためだった。
正しい解答で再確認し、正常に判定されることを確認済み（アプリの不具合ではない）。

---

## 2026-07-29: ログイン機能 段階1（Better Auth基盤 + メール/パスワード認証）

複数ユーザーが使える状態にするため、認証機能の実装を段階的に開始した。

### ライブラリ選定（実データに基づく判断）
過去のNext.js/Prismaと同様、**現時点のnpm上の実データで安定性を確認**して選定した。

| | Auth.js (next-auth) v5 | **Better Auth（採用）** |
|---|---|---|
| npm `latest` | **`4.24.15`（v4のまま）** | **`1.6.25`** |
| v5の状態 | `5.0.0-beta.32` | — |
| beta期間 | **2023-10-24〜2026-07-20（2年9ヶ月・33回）** | 1.0.0が2024-11、以降も定期リリース |

決め手は次の4点。
1. `next-auth`は3年近くbetaのままで`latest`は今もv4を指している
2. Better Authの`peerDependencies`が本プロジェクトの構成（Next.js 15.5 / Prisma 6.19 /
   React 19）と**完全に一致**すると明示されている
3. Auth.jsには**Credentials ProviderがJWTセッション専用でDBセッションと併用できない**制約が
   あり、今回の「メール認証とOAuthの両立」という要件と相性が悪い
4. `@auth/prisma-adapter`とPrisma 6の組み合わせでビルドが通らない不具合報告がある
   （過去に踏んだ地雷と同種のリスク）

さらに、Better Auth公式ドキュメントが**本プロジェクトのカスタム出力パス構成**
（`output = "../src/generated/prisma"`）のケースを明記しており、対応方法が確認できた。

### 実施内容
- `better-auth@1.6.25` を導入（パスワードハッシュ用の追加ライブラリは不要。内蔵のscryptを使用）
- `@better-auth/cli` でPrismaスキーマを生成 → **既存3モデルとgenerator設定が保持され、
  4テーブルの追加のみ**であることをバックアップとの差分で確認してからマイグレーション
- `src/lib/auth.ts`: サーバー設定。**既存の`src/lib/prisma.ts`のクライアントを再利用**し、
  接続が二重にならないようにした
- `src/lib/auth-client.ts` / `src/app/api/auth/[...all]/route.ts`
- `src/components/AuthForm.tsx`（登録/ログイン共通）、`src/app/signup`・`src/app/login`
- `src/components/SiteHeader.tsx`: **セッションをサーバー側で取得**して表示を出し分け
  （クライアントの状態を信用しない）。`SignOutButton.tsx`を追加
- `.env.example`: `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`/Google OAuth用のテンプレートを追加

### セキュリティ実装（ユーザー指示により既存規約より優先）
CLAUDE.mdの「存在しないエラーケースへの防御的なvalidationは書かない」という方針を、
**認証コードに限り意図的に適用しない**方針をユーザーと合意し、コード上にも明記した。
- ログイン失敗時は理由を区別せず共通メッセージ（アカウント列挙対策）
- 認証エンドポイントにレート制限（60秒あたり20回）
- セッションCookieは `httpOnly` / `sameSite=lax`（本番のみ`secure`）
- パスワードは8文字以上、scryptでハッシュ化
- CLAUDE.mdに「認証・セキュリティルール」の節を追加し、**認可はmiddlewareだけに依存しない**
  （CVE-2025-29927の教訓。本プロジェクトの15.5.21は修正済みだが設計原則として採用）、
  **`userId`はリクエストボディから受け取らない**方針を明文化した

### DBスキーマ変更 / API変更
- 追加: `User` / `Session` / `Account` / `Verification`（マイグレーション `add_auth_tables`）
- **既存の`LessonProgress`・`CourseProgress`・`StudyDay`は変更なし**（`userId`追加は段階2）
- 追加: `POST|GET /api/auth/[...all]`。既存APIは**変更なし**（認可の追加は段階3）

### 動作確認結果
- `npm run lint` / `npm run build` → いずれも成功
- **実ブラウザでの確認**（Playwright）:
  - 未ログイン時のヘッダー: 「ログイン / 新規登録」
  - 新規登録 → トップへ遷移し、ヘッダーがユーザー名＋ログアウトに変化
  - **セッションCookie: `httpOnly=true` / `sameSite=Lax`** を実測で確認
  - ログアウト → 未ログイン状態に戻る
  - 誤ったパスワード / 未登録のメールアドレス → **どちらも同一の
    「メールアドレスまたはパスワードが違います」**（列挙対策が機能）
  - 正しいパスワードで再ログイン成功
  - 同じメールアドレスでの二重登録はエラーになる（テスト中に確認）
- **パスワードの保存状態をDBで直接確認**:
  平文と不一致・平文を含まない・161文字のハッシュ、さらに
  **DBファイル全体をバイナリ走査しても平文が出現しない**ことを確認
- **回帰確認**: 4コース（HTML/CSS・JavaScript・Python・SQL）の判定が正常動作、
  全画面（トップ/コース詳細/ダッシュボード/ログイン/登録）が表示される
- ブラウザコンソールエラー: 0件（誤パスワード送信時の401ログを除く）
- 検証で作成したデータはコミット前にすべてクリア済み

### 検証時の補足
検証中に2回テストが失敗したが、いずれもテストスクリプト側の問題だった。
①`role="alert"`が開発オーバーレイと衝突してPlaywrightのstrictモード違反になり、
`catch`が握りつぶして「エラー表示なし」に見えていた（実際は正しく表示されていた）。
②同じメールアドレスで再実行したため二重登録エラーになった（正しい挙動）。
いずれもフォーム内へのセレクタ限定・DB初期化で解消し、全項目パスした。

### 次回やること（段階2: 既存データへのuserId追加）
- `LessonProgress`・`CourseProgress`・`StudyDay`に`userId`を追加
- **ユニーク制約の変更が必須**（`@@unique([courseId, lessonId])` →
  `@@unique([userId, courseId, lessonId])` など）。これを怠ると複数ユーザーが
  同じレッスンを学習できなくなる
- 進捗データの読み書きをすべてユーザー単位に絞り込む
- 着手前に変更ファイル一覧・DBスキーマ変更・API変更を提示する

---

## 2026-07-29: ログイン機能 段階2（進捗データをユーザーごとに分離）

段階1で作った認証基盤の上に、既存の進捗データをユーザー単位へ分離した。

### DBスキーマ変更（マイグレーション `add_user_id_to_progress`）
`LessonProgress` / `CourseProgress` / `StudyDay` の3テーブルに `userId` を追加し、
`User` への外部キー（`onDelete: Cascade`）を張った。

**今回の核心はユニーク制約の変更**で、単に列を足すだけでは機能が壊れる。

| テーブル | 変更前 | 変更後 |
|---|---|---|
| LessonProgress | `@@unique([courseId, lessonId])` | `@@unique([userId, courseId, lessonId])` |
| CourseProgress | `courseId @unique` | `@@unique([userId, courseId])` |
| StudyDay | `date @unique` | `@@unique([userId, date])` |

変更前のままだと「あるレッスンを学習できるのは全ユーザーの中で1人だけ」
「ある日に学習時間を記録できるのは1人だけ」という状態になる。
検索性能のため `@@index([userId])` も併せて追加した。

SQLiteはNOT NULL列の追加でテーブル再作成が必要になるため、`--create-only` で
生成SQLを確認してから適用した。3テーブルとも0件だったため失うデータはない
（既存データは移行しない方針で合意済み）。

### API変更
| エンドポイント | 変更 |
|---|---|
| `POST /api/progress` | 未ログインは401。`userId`はセッションから解決 |
| `POST /api/study-time` | 同上 |
| `GET /api/progress` | 未ログインは401 |
| `GET /api/courses` | 変更なし（教材内容のみでユーザーに依存しないため） |

**リクエストボディの形は変えていない。** `userId`をボディで受け取ると、他人のIDを
送るだけで他人の進捗を書き換えられるため。結果として `LessonWorkspace.tsx`・
`useDraftAutoSave.ts`・`useStudyTimeTracker.ts` は一切変更せずに済んだ。

### 実装の要点
- `src/lib/session.ts` を新設し、`getCurrentUserId()` に統一。
  認可をmiddlewareに任せず、データに触れる直前で毎回確認する方針を形にしたもの
- 読み取り系（`getAllCourseProgress` / `getLessonProgressMap`）は `userId` に
  `null` を許す。トップとコース詳細は未ログインでも見られる画面のため、
  **教材由来の情報（レッスン数など）は返しつつ進捗だけを空にする**
- 書き込み系（`updateLessonProgress` / `addStudyTime`）は `userId` を必須とし、
  「セッションから解決した値を渡すこと」をコメントで明示
- 学習画面とダッシュボードは `userId` が無いとデータを引けないため、
  未ログインなら `/login` へリダイレクト（ログイン後に元の画面へ戻す処理は段階3）

### 動作確認結果（すべて実測）
- `npm run lint` / `npm run build` 成功
- **ユニーク制約の検証**: ユーザーA・Bを作成し**同じレッスンを両方completedにできた**。
  DBを直接確認し、`ch1-01-html-structure` の行が2人分、同じ日付 `2026-07-29` の
  `StudyDay` も2人分独立して存在することを確認
- **進捗が混ざらない**: ダッシュボードの完了レッスン数が A=1 / B=2 と正しく分かれた
- **userId混入の無視**: Aのセッションで `POST /api/progress` のボディに**Bのidを混入**
  して送信 → 書き込まれたのは**Aの行**で、Bの行数は増えなかった。
  `/api/study-time` でも同様に確認
- **未ログイン**: トップは「4コース71レッスン」を表示しつつ進捗0%、コース詳細は
  カリキュラムが見えて完了バッジは0個（ログイン中のAは1個）。
  学習画面・ダッシュボードは `/login` へリダイレクト。
  3つのAPIはいずれも401
- **回帰**: 4コース（HTML/CSS・JavaScript・Python・SQL）の判定が正常。
  書きかけコードの自動保存・リロード復元・離脱時保存（`sendBeacon`）も従来どおり動作
  （sendBeaconは同一オリジンのためセッションCookieが送られることを実測で確認）
- ブラウザコンソールエラー: 0件
- 検証で作成したユーザー・進捗データはコミット前にすべて削除済み

### 検証時の補足
「正解です」の表示有無で判定していた箇所が false になったが、これはテスト側の問題。
最終スライドで正解すると次のレッスンへ自動遷移する仕様のため、判定表示が消えていた。
DBを直接確認したところ完了は正しく記録されていたため、遷移の発生自体を成功の証拠に
するようスクリプトを修正した。同様に、未ログイン時のコース詳細で「完了」が
検出されたのも「0 / 26 完了」というラベルへの部分一致が原因で、
ステータスバッジ自体は0個だった。

### 次回やること（段階3: 保護ルートの整備）
- 全ルートの保護方針の見直しとmiddleware（体験の最適化として）
- ログイン後に元のページへ戻す（`callbackURL`）
- 未ログイン時のトップ・コース詳細の見せ方の調整（ログインを促す導線）

---

## 2026-07-29: ログイン機能 段階3（保護ルートの整備・ログイン後の復帰・未ログイン時の導線）

DB変更・API変更はなし。画面遷移と認可の整理のみ。

### 保護範囲の整理
| ルート | 方針 |
|---|---|
| `/`、`/courses/[courseId]` | 公開（進捗・完了マーク・学習状況は非表示） |
| `/courses/.../lessons/...`、`/dashboard` | 要ログイン。戻り先付きで `/login` へ |
| `/login`、`/signup` | **ログイン済みなら戻り先（既定は `/`）へ** |
| 進捗系API | 要ログイン（401、段階2から変更なし） |
| `GET /api/courses` | 公開（段階2から変更なし） |

### ログイン後に元のページへ戻す（callbackUrl）
保護ページは `/login?callbackUrl=/courses/.../lessons/...` の形で飛ばし、
ログイン成功後にそこへ戻す。ログイン↔新規登録を行き来しても戻り先を引き継ぐ。

**ここでオープンリダイレクトに注意が必要だった。** 受け取った値をそのまま
`router.push()` に渡すと、`/login?callbackUrl=https://攻撃者のサイト` のような
URLを踏ませることで、自サイトのログイン画面から外部サイトへ誘導できてしまう
（フィッシングの常套手段）。

`src/lib/callbackUrl.ts` を新設し、次を満たす値だけを通して他は `/` に落とす。
- `/` で始まる相対パスのみ（`http://`、`//example.com`、`/\example.com` を弾く）
- 制御文字を含まない
- `/login`・`/signup` 自身ではない（ログイン後にログイン画面へ戻るループの防止）

検証はサーバー側（リダイレクト生成時）とクライアント側（遷移直前）の**両方**で行う。
1か所に頼ると、将来別の経路から値が渡されたときに素通りするため。

### 未ログイン時の導線
これまで未ログインでも「全体の進捗 0%」「0 / 26 完了」「未着手」が表示されていた。
アカウントの無い人にとって意味のない数字であり、「不正確・無意味な数字を見せない」
という方針とも合わないため、次のように差し替えた（**ログイン中の表示は変更なし**）。
- トップ: 進捗ブロック → 「アカウントを作ると、学習の記録が残ります」＋登録/ログイン導線
- トップのコース見出し: 「0 / 71 レッスン完了」 → 「全71レッスン」
- コース詳細: 進捗%と完了数を出さず、「レッスンを始めるにはログインが必要です」を表示
- コース詳細の章見出し: 「0 / 5」 → 「5レッスン」、各レッスン行の「未着手」は非表示
- ログイン画面: 保護ページから来た場合のみ「続けるにはログインが必要です」と理由を表示

### middlewareを採用しなかった理由
`middleware.ts` で先にリダイレクトすることも検討したが不採用とした。
Better Authの `getSessionCookie` はCookieの存在確認のみでセッションを検証しないため
それ自体は認可にならず、この規模では体感差もほとんどない。
一方で「middlewareがあるから安全」という誤解を生む余地が大きい。
認可は引き続き、データに触れる直前の `getCurrentUserId()` が担当する。

### 変更ファイル
- 新規: `src/lib/callbackUrl.ts`
- 変更: `AuthForm.tsx` / `login/page.tsx` / `signup/page.tsx` /
  学習画面 / `dashboard/page.tsx` / `page.tsx` / `courses/[courseId]/page.tsx` /
  `CLAUDE.md` / `docs/progress.md`
- 変更なし: Prismaスキーマ、全API、`content/`、`judge/`、`hooks/`、学習画面本体

### 動作確認結果（すべて実測）
- `npm run lint` / `npm run build` 成功
- **戻り先の検証を実装ファイルごと読み込んで17ケース確認**（写経した別実装ではなく本体を検証）
  通常パス・クエリ付きは通り、`https://`・`http://`・`//example.com`・`/\example.com`・
  `javascript:`・`/login`・`/signup`・改行/NUL混入・空/null/undefined・
  先頭スラッシュなしはすべて `/` に落ちた
- **実ブラウザ**:
  - 未ログインで学習画面 → `/login?callbackUrl=...` へ → **新規登録**して元のレッスンに復帰
  - ダッシュボードでも同様に復帰
  - 危険な `callbackUrl` 4種すべてで**外部オリジンに出ない**
  - `callbackUrl=/login` でループしない
  - ログイン済みで `/login`・`/signup` を開くと `/` へ
  - ログイン↔新規登録リンクのhrefに戻り先が引き継がれ、戻り先が無いときは余計なクエリが付かない
  - 未ログイン: 「全体の進捗」なし／「0 / 26 完了」なし／「未着手」なし／
    カリキュラムは閲覧可／登録案内あり
  - ログイン中: 進捗%・完了数・状態表示がすべて従来どおり
- **回帰**: 4コースの判定、書きかけコードの保存・リロード復元・離脱時保存すべて正常
- ライト/ダーク両モードでスクリーンショットを取得し、既存トークンと整合することを確認
- コンソールエラー: 0件
- 検証データはコミット前に全削除

### 検証時の補足
検証中に一度、全ページが500になった。原因は**dev サーバー起動中に `npm run build` を
実行して `.next` を壊した**ことで、コードの問題ではなかった（dev再起動で解消）。
また連続ログイン試行で429が出たが、これは段階1で入れた総当たり対策のレート制限が
効いているためで、25回連続の誤ログインを試して401が2回・429が23回になることを
確認した（意図した動作）。

### 次回やること（段階4: Google OAuth）
- **ユーザー側で行う外部設定が必要**:
  Google Cloud Consoleでプロジェクト作成 → OAuth同意画面（External、
  スコープは email / profile、テストユーザーに自分を追加）→ 認証情報で
  「OAuthクライアントID（ウェブアプリケーション）」を作成 →
  承認済みのJavaScript生成元 `http://localhost:3000`、
  承認済みのリダイレクトURI `http://localhost:3000/api/auth/callback/google` を登録 →
  発行された値を`.env`の`GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET`に貼り付け
- 実装側: `auth.ts`にsocialProvidersを追加、ログイン/登録画面にGoogleボタンを追加
- 同一メールアドレスでのメール認証アカウントとの紐付け方針を実装前に確認する
