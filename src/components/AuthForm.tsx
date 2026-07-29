"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { sanitizeCallbackUrl } from "@/lib/callbackUrl";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { AlertIcon } from "@/components/icons";

type AuthFormProps = {
  mode: "signup" | "login";
  /** ログイン後の戻り先。保護されたページから来た場合に渡される */
  callbackUrl?: string;
};

/** パスワードの最低文字数。サーバー側(auth.ts)の設定と揃えている */
const MIN_PASSWORD_LENGTH = 8;

/**
 * ログイン失敗の理由は画面に出さない。
 * 「このメールアドレスは登録されていません」のように区別して返すと、
 * どのアドレスが登録済みかを外部から調べられてしまうため（アカウント列挙対策）。
 */
const LOGIN_FAILED_MESSAGE = "メールアドレスまたはパスワードが違います";
const SIGNUP_FAILED_MESSAGE =
  "登録できませんでした。入力内容を確認してください";

export function AuthForm({ mode, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  // 戻り先はページ側でも検証済みだが、遷移する直前にもう一度通す。
  // 検証を1か所に頼ると、将来別の場所から渡されたときに素通りしてしまうため
  const destination = sanitizeCallbackUrl(callbackUrl);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください`);
      return;
    }

    setSubmitting(true);
    const result = isSignup
      ? await signUp.email({ name, email, password })
      : await signIn.email({ email, password });
    setSubmitting(false);

    if (result.error) {
      setErrorMessage(isSignup ? SIGNUP_FAILED_MESSAGE : LOGIN_FAILED_MESSAGE);
      return;
    }

    router.push(destination);
    router.refresh();
  }

  return (
    <>
      <div className="mt-8">
        <GoogleSignInButton callbackUrl={destination} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-hairline" />
        <span className="type-caption text-ink-tertiary">
          またはメールアドレスで
        </span>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {isSignup && (
          <div>
            <label htmlFor="name" className="type-body-sm font-medium text-ink">
              お名前
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="interactive mt-1.5 w-full rounded-lg border border-hairline bg-surface-1 px-3 py-2.5 text-ink outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="type-body-sm font-medium text-ink">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="interactive mt-1.5 w-full rounded-lg border border-hairline bg-surface-1 px-3 py-2.5 text-ink outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="password" className="type-body-sm font-medium text-ink">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="interactive mt-1.5 w-full rounded-lg border border-hairline bg-surface-1 px-3 py-2.5 text-ink outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring"
          />
          {isSignup && (
            <p className="type-caption mt-1.5 text-ink-tertiary">
              {MIN_PASSWORD_LENGTH}文字以上で入力してください
            </p>
          )}
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="type-body-sm flex items-start gap-2 rounded-lg border-l-2 border-destructive bg-destructive/10 px-3 py-2.5 text-destructive-text"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="interactive mt-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-accent-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "処理中…" : isSignup ? "アカウントを作成" : "ログイン"}
        </button>

        <p className="type-body-sm mt-2 text-center text-ink-subtle">
          {isSignup ? "すでにアカウントをお持ちですか？ " : "アカウントがまだですか？ "}
          <Link
            href={`${isSignup ? "/login" : "/signup"}${
              // 画面を行き来しても戻り先を見失わないように引き継ぐ
              destination === "/" ? "" : `?callbackUrl=${encodeURIComponent(destination)}`
            }`}
            className="interactive rounded-sm font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isSignup ? "ログイン" : "新規登録"}
          </Link>
        </p>
      </form>
    </>
  );
}
