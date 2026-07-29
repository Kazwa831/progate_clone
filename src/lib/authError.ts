/**
 * 認証で失敗したときにURLへ付く error の説明文。
 *
 * 一番起こりやすいのは account_not_linked で、
 * 「同じメールアドレスがすでにパスワードで登録されている」ケース。
 * このアプリはメールアドレスの所有確認をしていないため、
 * Google側が確認済みでもパスワードアカウントへは自動で紐付けない
 * （紐付けると、他人のアドレスで先に登録した人がそのまま入れてしまう）。
 */
const MESSAGES: Record<string, string> = {
  account_not_linked:
    "このメールアドレスはパスワードで登録済みです。パスワードでログインしてください。",
  unable_to_link_account:
    "アカウントを連携できませんでした。時間をおいて試してください。",
  email_doesn_t_match: "メールアドレスが一致しませんでした。",
  signup_disabled: "現在、新規登録を受け付けていません。",
  access_denied: "Googleでの認証がキャンセルされました。",
};

const FALLBACK_MESSAGE = "ログインできませんでした。もう一度お試しください。";

export function authErrorMessage(error: string | undefined): string | null {
  if (!error) return null;
  return MESSAGES[error] ?? FALLBACK_MESSAGE;
}
