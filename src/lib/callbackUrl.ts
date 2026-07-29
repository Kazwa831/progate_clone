const FALLBACK_PATH = "/";

/** ログイン後に戻ってはいけない画面（戻すとログイン画面をループする） */
const EXCLUDED_PATHS = ["/login", "/signup"];

/** 改行などの制御文字。混ざったURLはブラウザごとに解釈が割れるため受け付けない */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * ログイン後の戻り先として安全な値だけを通す。危険な値は "/" に落とす。
 *
 * 受け取った値をそのまま遷移先に使うと、
 * /login?callbackUrl=https://攻撃者のサイト のようなURLを踏ませることで、
 * 自サイトのログイン画面から外部サイトへ誘導できてしまう
 * （オープンリダイレクト。フィッシングに使われる）。
 *
 * 認証まわりのコードなので、CLAUDE.mdの「防御的なvalidationは書かない」方針は
 * ここでも適用しない。
 */
export function sanitizeCallbackUrl(value: string | null | undefined): string {
  if (typeof value !== "string" || value.length === 0) return FALLBACK_PATH;

  // 自サイト内の相対パスだけを許す
  if (!value.startsWith("/")) return FALLBACK_PATH;

  // "//example.com" や "/\example.com" はブラウザに別オリジンとして解釈される
  if (value.startsWith("//") || value.startsWith("/\\")) return FALLBACK_PATH;

  if (CONTROL_CHARACTERS.test(value)) return FALLBACK_PATH;

  const path = value.split(/[?#]/)[0];
  if (EXCLUDED_PATHS.includes(path)) return FALLBACK_PATH;

  return value;
}

/** 保護されたページから未ログインの人をログイン画面へ送るためのURLを組み立てる */
export function loginUrlFor(pathname: string): string {
  return `/login?callbackUrl=${encodeURIComponent(sanitizeCallbackUrl(pathname))}`;
}
