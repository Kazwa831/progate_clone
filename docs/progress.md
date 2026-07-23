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
