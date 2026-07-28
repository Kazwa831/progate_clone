/**
 * 日付を "YYYY-MM-DD" の文字列にする（実行環境のローカルタイムゾーン基準）。
 *
 * 学習日はこの文字列で保存する。DateTimeとして保存するとSQLiteにはUTCで
 * 入るため、深夜0〜9時(JST)に学習した記録がSQLの日付関数では前日として
 * 集計されてしまい、連続学習日数がずれる。
 *
 * 学習画面（クライアント）と集計（サーバー）の両方から使うため、
 * DBに依存しない純粋な関数としてここに置いている。
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "YYYY-MM-DD" をローカルタイムゾーンの0時のDateに戻す */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** 2つの日付が何日離れているか（同じ日なら0、翌日なら1） */
export function differenceInDays(later: Date, earlier: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  // 夏時間のある地域でも日数がずれないよう四捨五入する
  return Math.round((later.getTime() - earlier.getTime()) / msPerDay);
}
