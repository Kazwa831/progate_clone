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
