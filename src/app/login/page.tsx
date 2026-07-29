import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { AlertIcon } from "@/components/icons";
import { sanitizeCallbackUrl } from "@/lib/callbackUrl";
import { authErrorMessage } from "@/lib/authError";
import { getCurrentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "ログイン | Progate Clone",
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl, error } = await searchParams;
  const destination = sanitizeCallbackUrl(callbackUrl);
  const errorMessage = authErrorMessage(error);

  // ログイン済みの人にログイン画面を見せない
  if ((await getCurrentUserId()) !== null) {
    redirect(destination);
  }

  // 保護されたページから飛ばされてきた場合だけ、その理由を伝える
  const cameFromProtectedPage = destination !== "/";

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-6 pt-16 pb-24">
        <p className="type-eyebrow text-ink-tertiary">Sign in</p>
        <h1 className="type-headline mt-3 text-ink">ログイン</h1>
        <p className="type-body-sm mt-2 text-ink-subtle">
          {cameFromProtectedPage
            ? "続けるにはログインが必要です。ログインすると元の画面に戻ります。"
            : "続きから学習を再開しましょう。"}
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="type-body-sm mt-6 flex items-start gap-2 rounded-lg border-l-2 border-destructive bg-destructive/10 px-3 py-2.5 text-destructive-text"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </p>
        )}

        <AuthForm mode="login" callbackUrl={destination} />
      </main>
    </div>
  );
}
