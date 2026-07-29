# CLAUDE.md

このファイルは、Claude Code がこのリポジトリで作業する際に常に参照するプロジェクト固有のガイドラインです。

## プロジェクト概要

**progate_clone** — Progate風の自作プログラミング学習プラットフォーム。
「スライド解説 → コード入力 → 実行結果確認 → 正誤判定 → 次のレッスンへ」という学習体験を再現する。
第1弾は HTML/CSS基礎コースを完成させる。将来的に JavaScript / Python / SQL コースへ
`content/` 配下にJSONを追加するだけで拡張できる設計にする。ローカル運用が前提。
当初は単一ユーザー前提で作っていたが、ポートフォリオとして複数人が使える状態にするため
認証機能を後から追加した（「認証・セキュリティルール」を参照）。

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
│   │   ├── dashboard/page.tsx              # 学習ダッシュボード（完了一覧・統計）
│   │   ├── courses/[courseId]/page.tsx     # コース詳細
│   │   ├── courses/[courseId]/lessons/[lessonId]/page.tsx  # 学習画面
│   │   └── api/
│   │       ├── auth/[...all]/route.ts # 認証（Better Auth）
│   │       ├── progress/route.ts    # 進捗の取得・更新（上書き）
│   │       ├── study-time/route.ts  # 学習時間の加算・学習実績の記録
│   │       └── courses/route.ts
│   ├── components/
│   │   ├── SlidePanel.tsx
│   │   ├── CodeEditor.tsx
│   │   ├── PreviewPane.tsx
│   │   ├── ResultChecker.tsx
│   │   ├── LessonWorkspace.tsx      # 学習画面の中核（4コース共通）
│   │   ├── LessonSidebar.tsx
│   │   ├── LessonTabs.tsx           # 狭い画面の表示切替（解説/コード/結果）
│   │   ├── LessonActionBar.tsx      # 狭い画面の下部固定の操作バー
│   │   ├── LessonDrawer.tsx         # 狭い画面のレッスン一覧ドロワー
│   │   ├── SiteHeader.tsx           # 全画面共通のヘッダー
│   │   ├── AuthForm.tsx             # 登録/ログイン共通フォーム
│   │   ├── SignOutButton.tsx        # ログアウト
│   │   ├── GoogleSignInButton.tsx   # Googleでログイン
│   │   ├── StatCard.tsx             # ダッシュボードの数値タイル
│   │   ├── StreakBadges.tsx         # 連続学習日数の達成バッジ
│   │   ├── CompletedLessonList.tsx  # 完了レッスンの履歴一覧
│   │   └── CourseCard.tsx
│   ├── hooks/                       # 複数箇所から使う、またはコンポーネントから
│   │   ├── useDraftAutoSave.ts      # 切り出したいReactロジックを置く
│   │   └── useStudyTimeTracker.ts   # 学習時間の計測
│   ├── lib/
│   │   ├── prisma.ts                # Prismaクライアントのシングルトン
│   │   ├── auth.ts                  # 認証のサーバー設定（Better Auth）
│   │   ├── auth-client.ts           # 認証のクライアント
│   │   ├── session.ts               # ログイン中のユーザーIDの取得
│   │   ├── callbackUrl.ts           # ログイン後の戻り先の検証
│   │   ├── authError.ts             # 認証エラーの説明文
│   │   ├── contentLoader.ts
│   │   ├── progress.ts              # 進捗の保存・取得
│   │   ├── statistics.ts            # 学習ダッシュボード用の集計
│   │   ├── studyTime.ts             # 学習時間の記録・連続学習日数の計算
│   │   ├── dateKey.ts               # 日付の文字列化（クライアント/サーバー共用）
│   │   ├── courseNavigation.ts      # 章をまたいだレッスン順序
│   │   ├── lessonCode.ts            # スライドの初期コード（サーバー/クライアント共用）
│   │   └── judge/                   # 言語ごとの判定ロジック
│   │       ├── htmlCssJudge.ts
│   │       ├── javascriptJudge.ts
│   │       ├── pythonJudge.ts
│   │       ├── sqlJudge.ts
│   │       └── types.ts
│   ├── types/
│   │   └── lesson.ts
│   └── generated/prisma/            # Prisma自動生成コード（Gitには含めない）
├── docs/
│   ├── progate_clone_design_doc.md  # 唯一の仕様書
│   ├── design.md                    # UI刷新の参考資料（ダークモードの配色）
│   ├── design-light.md              # UI刷新の参考資料（ライトモードの配色）
│   └── progress.md                  # 進捗ログ
└── CLAUDE.md
```

各ディレクトリは「9. 開発ステップ」の該当ステップに到達したタイミングで作成する
（先回りして空フォルダを大量に作らない）。

## 設計方針

- コース・レッスンのデータは `content/` 配下のJSONとして管理し、新言語コース追加時に
  コードを書き足さずに済む拡張性を最優先する。
- 判定ロジック（`judge/`）は言語ごとにファイルを分け、`checkType` によるStrategyパターンで分岐する。
- 進捗はDB（Prisma + SQLite）に保存し、ログイン中のユーザーに紐づけて管理する。
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
- コンポーネントが大きくなり見通しが悪くなる場合は、Reactのロジック（`useEffect`での
  購読・タイマー処理など）を `src/hooks/` のカスタムフックへ切り出す。
  Reactに依存しない純粋なロジックは `src/lib/` に置く。

## レスポンシブのルール

- ブレークポイントは `md`（768px）を境にする。**`md`以上は既存のデスクトップ表示を変えない**。
  モバイル対応で追加するクラスには、必要に応じて `sm:`/`md:` で打ち消しを添える
  （例: タップ領域の `min-h-11 sm:min-h-0`）。
- 学習画面は、`md`未満では3ペインを並べられないため
  **タブ（解説 / コード / 結果）で1つずつ表示**し、前へ・次へ・実行は下部固定の操作バーに集約する。
  `md`以上は従来どおり3ペインを並べる。DOMは共通で、表示/非表示だけを切り替える。
- 画面の高さいっぱいに広げるときは `h-screen`(100vh)ではなく `h-dvh` を使う
  （iOS SafariでURLバーの分だけ実表示領域を超えるため）。
- タップできる要素は44px以上の高さを確保する。ただしカード全体が
  `::before` で当たり判定になっているものは、中のリンクが小さくても問題ない。

## デザインルール

配色・タイポグラフィは `src/app/globals.css` のトークンに集約する。
個々のコンポーネントで色や文字サイズを直接指定しない。

- **面の階調**: `canvas → surface-1 → surface-2 → surface-3` の4段。要素の重要度に
  応じて使い分け、すべてのカードを同じ見た目にしない。持ち上げは `.elevate-1` /
  `.elevate-2` を使う（ライトは影、ダークは階調で表現が切り替わる）。
- **タイポグラフィ**: `.type-display / headline / card-title / body / body-sm /
  caption / eyebrow / metric` を使う。大きい文字ほど字送りを詰め、`eyebrow` だけは
  逆に広げて大文字にする（見出しではなく分類であることを示すため）。
- **ホバー**: 操作できる要素には `.interactive` を付けて変化を滑らかにする。
  カードは `.lift-on-hover` でわずかに浮かせる。
- **配色の出典**: ダークは `docs/design.md`、ライトは `docs/design-light.md` を参考に
  しているが、角丸・余白・字送りなどの構造は両モード共通にする。
  アクセント（ラベンダー）はブランド色として両モードで共通。

## 認証・セキュリティルール

認証には **Better Auth** を使う（`next-auth`はv5が長期betaのままで`latest`がv4のため不採用）。

- **認証コードでは「防御的なvalidationは書かない」というコーディングルールを適用しない。**
  認証における「起きないはずの入力」は攻撃者が意図的に作る入力であり、防御を省くと
  脆弱性になるため。逸脱していることをコード上のコメントで明示する。
- **認可はmiddlewareだけに依存しない。** データに触れる直前（Server Component /
  Route Handler）で必ずセッションを検証する。middlewareは体験の最適化と位置づける。
- **`userId`はリクエストボディから受け取らない。** 必ず `getCurrentUserId()`
  （`src/lib/session.ts`）でセッションから解決する。ボディで受けると、他人のIDを
  送るだけで他人のデータを読み書きできてしまう。
- **ログイン後の戻り先（callbackUrl）は必ず `sanitizeCallbackUrl()` を通す。**
  受け取った値をそのまま遷移先にすると、自サイトのログイン画面から外部サイトへ
  誘導できてしまう（オープンリダイレクト）。自サイト内の相対パスだけを許可する。
- ログイン失敗のメッセージは理由を区別せず共通化する（アカウント列挙対策）。
- パスワードはBetter Auth標準のscryptでハッシュ化する。平文は保存もログ出力もしない。
- 秘密情報は`.env`のみに置く（`.gitignore`済み）。`.env.example`にはキー名と取得方法だけ書く。

### Google OAuthとアカウント紐付け

- **`accountLinking.trustedProviders` は設定しない。** Better Authの判定は
  `(!isTrustedProvider && !userInfo.emailVerified)` で拒否する形になっており、
  信頼済みにするとGoogle側の`email_verified`の確認ごと飛ばされる。
  未設定にすることで「Googleが確認済みのときだけ紐付ける」が成立する。
- **`requireLocalEmailVerified` は既定の`true`のまま。** このアプリはメールアドレスの
  所有確認をしていないため、`false`にすると「攻撃者が他人のアドレスでパスワード登録
  → 後で本人がGoogleログイン → 紐付いて攻撃者のパスワードでも入れる」という
  乗っ取りが成立する。その結果、パスワード登録済みのアドレスとは紐付かず
  `account_not_linked` になるので、ログイン画面で理由を案内する。
- 将来メール確認機能を入れるまで、`accountLinking` は実質的に働かない点に注意。

### 保護範囲

| ルート | 方針 |
|---|---|
| `/`、`/courses/[courseId]` | 公開。未ログインでは進捗・完了マーク・学習状況を**出さない** |
| `/courses/.../lessons/...`、`/dashboard` | 要ログイン。`/login?callbackUrl=元のパス` へ |
| `/login`、`/signup` | ログイン済みなら戻り先（既定は `/`）へ |
| `POST /api/progress`、`POST /api/study-time`、`GET /api/progress` | 要ログイン（401） |
| `GET /api/courses` | 公開（教材内容のみでユーザーに依存しない） |

未ログインの人に「全体の進捗 0%」のような**その人にとって意味のない数字は出さない**。
アカウント作成の案内に置き換える。

## API設計ルール

- Next.js の Route Handlers (`src/app/api/**/route.ts`) を使用する。
- GET は `content/` のJSON読み込みやDB参照など副作用のない取得のみに使う。
- POST は進捗更新など状態変更のみに使う。
- レスポンスは常にJSON。エラー時もステータスコードと `{ error: string }` 形式で統一する。
- Next.js 15の非同期`params`/`searchParams`規約に従い、動的ルートでは
  `await params` の形で受け取る。

## DB設計ルール

- 認証関連のテーブル（`User` / `Session` / `Account` / `Verification`）はBetter Authの
  スキーマに従う。手で書き換えず、`npx @better-auth/cli generate` の出力を使う。
- 進捗系のテーブルは必ず `userId` を持ち、ユニーク制約にも `userId` を含める
  （含めないと、あるユーザーが学習したレッスンを他のユーザーが学習できなくなる）。
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
