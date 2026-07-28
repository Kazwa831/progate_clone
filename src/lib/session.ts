import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * ログイン中のユーザーIDを取得する。未ログインならnull。
 *
 * 進捗の読み書きでは、必ずこの関数で解決したIDを使うこと。
 * リクエストボディから受け取ったIDを使うと、他人のIDを送るだけで
 * 他人のデータを読み書きできてしまう。
 *
 * 認可をmiddlewareだけに任せず、データに触れる直前（Server Component /
 * Route Handler）で毎回確認するために、あえて薄い関数として切り出している。
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}
