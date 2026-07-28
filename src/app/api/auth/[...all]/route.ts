import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// 登録・ログイン・ログアウト・セッション取得などの認証エンドポイントをまとめて公開する
export const { GET, POST } = toNextJsHandler(auth);
