# CLAUDE.md

このファイルは、Claude Code がこのリポジトリで作業する際に常に参照するプロジェクト固有のガイドラインです。

## プロジェクト概要

**progate_clone** — Progate風の自作プログラミング学習プラットフォーム。
「スライド解説 → コード入力 → 実行結果確認 → 正誤判定 → 次のレッスンへ」という学習体験を再現する。
第1弾は HTML/CSS基礎コースを完成させる。将来的に JavaScript / Python / SQL コースへ
`content/` 配下にJSONを追加するだけで拡張できる設計にする。単一ユーザー・ローカル運用が前提で、
認証機能は作らない。

## 開発目的

**就職活動のための個人ポートフォリオ**。実務でよく使われるモダンな技術構成を採用し、
保守性・可読性・拡張性を重視した設計・実装であることを示す。動作の安定性を優先し、
未経験者が読んでも理解できるコードを書く。

## 唯一の仕様書

**`docs/progate_clone_design_doc.md` を唯一の仕様書として扱うこと。**
実装で仕様に不明点・矛盾・古い実装方法が見つかった場合は、勝手に判断せず実装前に確認する。

## 技術スタック

| 分類 | 採用技術 | バージョン方針 |
|---|---|---|
| フレームワーク | Next.js (App Router) + TypeScript | 15.x系最新（安定重視。16系のasync params等の破壊的変更とPrisma7との既知の不具合を避けるため） |
| スタイリング | Tailwind CSS | v4（CSS-first設定。`tailwind.config.js`は使わず`globals.css`内の`@theme`で管理） |
| DB | SQLite（`data/app.db`） | ローカル運用、単一ファイル |
| ORM | Prisma | 6.x系最新。generatorは`prisma-client`（新形式、出力先`src/generated/prisma`）、engineは`classic` |
| コード実行環境(HTML/CSS) | iframe + srcdoc | サーバー不要、ブラウザ内完結でセキュア |
| コード実行環境(将来: JS) | iframe内`<script>`実行 + postMessage | 同じサンドボックス思想を踏襲 |
| コード実行環境(将来: Python) | Pyodide (WebAssembly版Python) | ブラウザ内実行 |
| エディタ | CodeMirror 6 | 軽量・拡張しやすい |
| パッケージ管理 | npm | — |

新しいライブラリを導入する場合は、導入理由を必ず説明すること。

## ディレクトリ構成

```
progate_clone/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── prisma.config.ts                # Prisma 6の設定ファイル（DATABASE_URL等）
├── data/
│   └── app.db                      # SQLite本体（Gitには含めない）
├── content/                        # コース内容(JSON)。増やすだけでコース追加可能
│   └── html-css/
│       ├── course.json
│       └── lessons/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # コース一覧トップページ
│   │   ├── courses/[courseId]/page.tsx     # コース詳細
│   │   ├── courses/[courseId]/lessons/[lessonId]/page.tsx  # 学習画面
│   │   └── api/
│   │       ├── progress/route.ts
│   │       └── courses/route.ts
│   ├── components/
│   │   ├── SlidePanel.tsx
│   │   ├── CodeEditor.tsx
│   │   ├── PreviewPane.tsx
│   │   ├── ResultChecker.tsx
│   │   ├── ProgressBar.tsx
│   │   └── CourseCard.tsx
│   ├── lib/
│   │   ├── prisma.ts                # Prismaクライアントのシングルトン
│   │   ├── contentLoader.ts
│   │   └── judge/
│   │       ├── htmlCssJudge.ts
│   │       └── types.ts
│   ├── types/
│   │   └── lesson.ts
│   └── generated/prisma/            # Prisma自動生成コード（Gitには含めない）
├── docs/
│   ├── progate_clone_design_doc.md  # 唯一の仕様書
│   └── progress.md                  # 進捗ログ
└── CLAUDE.md
```

各ディレクトリは「9. 開発ステップ」の該当ステップに到達したタイミングで作成する
（先回りして空フォルダを大量に作らない）。

## 設計方針

- コース・レッスンのデータは `content/` 配下のJSONとして管理し、新言語コース追加時に
  コードを書き足さずに済む拡張性を最優先する。
- 判定ロジック（`judge/`）は言語ごとにファイルを分け、`checkType` によるStrategyパターンで分岐する。
- 進捗はDB（Prisma + SQLite）に保存し、単一ユーザー前提のため `User` テーブルは持たない。
- コード実行はすべてブラウザ内サンドボックス（iframe / 将来はPyodide）で完結させ、
  サーバーサイドでユーザーコードを実行しない。

## コーディングルール

- **保守性・可読性を最優先**する。未経験者が読んでも理解できるシンプルな実装を心がける。
- コメントは「なぜ」がわかりにくい箇所にのみ最小限で書く。「何をしているか」は
  命名で表現し、コメントで説明しない。
- 過剰な抽象化・先回りの汎用化はしない。今必要な範囲だけを実装する（YAGNI）。
- 存在しないエラーケースへの防御的なtry/catchやvalidationは書かない。
- 新しいライブラリを追加するときは、必ず導入理由を説明してから追加する。
- Prismaのgeneratorは `prisma-client`（新形式）を使う。インポートは
  `@/generated/prisma/client` から行う（`@prisma/client` からのimportではない点に注意）。

## コンポーネント設計ルール

- `src/components/` 配下は1コンポーネント1責務を基本とする
  （例: スライド表示・エディタ・プレビュー・判定結果表示をそれぞれ分離）。
- Server Component をデフォルトとし、インタラクション（エディタ入力、iframe操作など）が
  必要な部分だけ `"use client"` を付与する。
- Propsの型は各コンポーネントファイル内、または `src/types/` で明示的に定義する。

## API設計ルール

- Next.js の Route Handlers (`src/app/api/**/route.ts`) を使用する。
- GET は `content/` のJSON読み込みやDB参照など副作用のない取得のみに使う。
- POST は進捗更新など状態変更のみに使う。
- レスポンスは常にJSON。エラー時もステータスコードと `{ error: string }` 形式で統一する。
- Next.js 15の非同期`params`/`searchParams`規約に従い、動的ルートでは
  `await params` の形で受け取る。

## DB設計ルール

- 単一ユーザー前提のため認証・ユーザーテーブルは作らない。
- `prisma/schema.prisma` を変更したら必ず `npx prisma migrate dev --name <説明>` で
  マイグレーションを作成し、コミットに含める。
- SQLiteファイル本体（`data/app.db`）と生成物（`src/generated/prisma/`）はGit管理しない。
- スキーマ変更の理由が仕様書に無い場合は、実装前に確認する。

## 実装順序（設計書「9. 開発ステップ」に準拠）

1. プロジェクト初期セットアップ（Next.js + TypeScript + Tailwind + Prisma(SQLite)、疎通確認）
2. コンテンツ読み込み基盤（`content/html-css/` JSON構造 + `contentLoader.ts`）
3. コース一覧・コース詳細画面
4. 学習画面（3ペイン: スライド / エディタ / プレビュー）の土台
5. 正誤判定ロジック（`contains-tag` など）
6. 進捗保存機能（Prismaスキーマ確定、`/api/progress`）
7. HTML/CSSコースの中身を拡充
8. （将来）JavaScriptコース追加

**一度に全ステップを実装しない。1ステップずつ実装し、都度動作確認を行い、
完了後は次のステップに進む前に必ず報告・停止する。**

## 運用ルール

- **`docs/progate_clone_design_doc.md` を唯一の仕様書として扱うこと。** 実装はこれに従う。
- **`docs/progress.md` を作業の区切りごとに必ず更新すること**
  （実装内容・変更ファイル・動作確認結果・次回やることを記録）。
- 機能実装後は必ずビルド・起動・動作確認を行い、その結果を `docs/progress.md` に記録すること。
- 保守性・可読性を最優先にし、未経験者にも理解しやすいコードを書くこと。
- 新しいライブラリを導入する際は、導入理由を必ず説明すること。
- GitHubへ push する前には、変更内容・コミットメッセージ・pushされるファイル一覧を
  提示し、ユーザーの確認を取ってから実行すること。
