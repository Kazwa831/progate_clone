"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    // サーバー側で描画しているヘッダーや進捗を、ログアウト後の状態で取り直す
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="interactive type-body-sm ml-1 rounded-md px-3 py-1.5 font-medium text-ink-subtle hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      ログアウト
    </button>
  );
}
