"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";

type GoogleSignInButtonProps = {
  /** 認証後の戻り先。呼び出し元で検証済みの値を渡す */
  callbackUrl: string;
};

/**
 * Googleのマーク。「Googleでログイン」ボタンに使う公式の配色に合わせている。
 * 自作のロゴではなくGoogleの標識なので、この用途以外には使わない。
 */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ callbackUrl }: GoogleSignInButtonProps) {
  const [redirecting, setRedirecting] = useState(false);

  async function handleClick() {
    setRedirecting(true);
    // 成功時は元の画面へ、失敗時はログイン画面へ戻して理由を伝える
    await signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
      errorCallbackURL: "/login",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={redirecting}
      className="interactive flex w-full items-center justify-center gap-2.5 rounded-lg border border-hairline-strong bg-surface-1 px-5 py-3 text-sm font-medium text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
    >
      <GoogleMark className="h-4.5 w-4.5" />
      {redirecting ? "Googleに移動しています…" : "Googleで続ける"}
    </button>
  );
}
