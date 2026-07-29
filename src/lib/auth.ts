import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

/**
 * 認証の設定。
 *
 * このファイルを含む認証まわりのコードでは、CLAUDE.mdの
 * 「存在しないエラーケースへの防御的なvalidationは書かない」という方針を
 * 意図的に適用しない。認証における「起きないはずの入力」は、攻撃者が
 * 意図的に作る入力そのものであり、防御を省くと脆弱性になるため。
 *
 * Prismaクライアントは本プロジェクトのカスタム出力先
 * (src/generated/prisma) から作られたものを使い回す。
 * ここで新しくPrismaClientを作ると接続が二重になるため。
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // メール確認は段階1では求めない（メール送信基盤がないため）。
    // 認証情報そのものの安全性には影響しない。
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  account: {
    accountLinking: {
      enabled: true,

      // trustedProviders は「あえて設定しない」。
      // Better Authの判定は
      //   (!isTrustedProvider && !userInfo.emailVerified) → 紐付け拒否
      // という形になっており、信頼済みにするとGoogle側のemail_verifiedの
      // 確認ごと飛ばされてしまう。未設定にすることで
      // 「Googleがメールアドレスを確認済みのときだけ紐付ける」が成立する。

      // requireLocalEmailVerified は既定の true のまま使う。
      // このアプリはメールアドレスの所有確認をしていないため、falseにすると
      // 「攻撃者が他人のアドレスでパスワード登録 → 後で本人がGoogleログイン →
      // 紐付いて攻撃者のパスワードでも入れる」という乗っ取りが成立してしまう。
      // その結果、パスワード登録済みのアドレスとは紐付かず
      // account_not_linked になるので、ログイン画面で理由を案内する。
    },
  },

  // 紐付けできなかった場合などに、既定の /api/auth/error ではなく
  // 自前のログイン画面へ戻して理由を日本語で伝える
  onAPIError: {
    errorURL: "/login",
  },

  // 総当たり攻撃を抑えるため、認証エンドポイントへのリクエストを制限する
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },

  advanced: {
    // セッションCookieはJavaScriptから読めないようにし、
    // 他サイトからの遷移では送られないようにする（XSS・CSRF対策）
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
});
