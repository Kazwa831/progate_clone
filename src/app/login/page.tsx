import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { sanitizeCallbackUrl } from "@/lib/callbackUrl";
import { getCurrentUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "ログイン | Progate Clone",
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  const destination = sanitizeCallbackUrl(callbackUrl);

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
        <AuthForm mode="login" callbackUrl={destination} />
      </main>
    </div>
  );
}
