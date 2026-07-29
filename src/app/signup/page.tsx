import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { AlertIcon } from "@/components/icons";
import { sanitizeCallbackUrl } from "@/lib/callbackUrl";
import { authErrorMessage } from "@/lib/authError";
import { getCurrentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "新規登録 | Progate Clone",
};

type SignupPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { callbackUrl, error } = await searchParams;
  const destination = sanitizeCallbackUrl(callbackUrl);
  const errorMessage = authErrorMessage(error);

  // ログイン済みの人に登録画面を見せない
  if ((await getCurrentUserId()) !== null) {
    redirect(destination);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-6 pt-16 pb-24">
        <p className="type-eyebrow text-ink-tertiary">Create account</p>
        <h1 className="type-headline mt-3 text-ink">アカウントを作成</h1>
        <p className="type-body-sm mt-2 text-ink-subtle">
          学習の進捗はアカウントごとに保存されます。
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

        <AuthForm mode="signup" callbackUrl={destination} />
      </main>
    </div>
  );
}
