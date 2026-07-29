import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { sanitizeCallbackUrl } from "@/lib/callbackUrl";
import { getCurrentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "新規登録 | Progate Clone",
};

type SignupPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { callbackUrl } = await searchParams;
  const destination = sanitizeCallbackUrl(callbackUrl);

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
        <AuthForm mode="signup" callbackUrl={destination} />
      </main>
    </div>
  );
}
