import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "新規登録 | Progate Clone",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-6 pt-16 pb-24">
        <p className="type-eyebrow text-ink-tertiary">Create account</p>
        <h1 className="type-headline mt-3 text-ink">アカウントを作成</h1>
        <p className="type-body-sm mt-2 text-ink-subtle">
          学習の進捗はアカウントごとに保存されます。
        </p>
        <AuthForm mode="signup" />
      </main>
    </div>
  );
}
