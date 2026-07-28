import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "ログイン | Progate Clone",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-6 pt-16 pb-24">
        <p className="type-eyebrow text-ink-tertiary">Sign in</p>
        <h1 className="type-headline mt-3 text-ink">ログイン</h1>
        <p className="type-body-sm mt-2 text-ink-subtle">
          続きから学習を再開しましょう。
        </p>
        <AuthForm mode="login" />
      </main>
    </div>
  );
}
