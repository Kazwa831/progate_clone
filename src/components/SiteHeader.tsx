import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

type SiteHeaderProps = {
  /** 現在地を示すために、該当するリンクを強調する */
  current?: "courses" | "dashboard";
};

export async function SiteHeader({ current }: SiteHeaderProps) {
  // セッションはサーバー側で取得する。クライアントの状態を信用しない
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="type-card-title rounded-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Progate Clone
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`interactive type-body-sm rounded-md px-3 py-1.5 font-medium hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              current === "courses" ? "text-ink" : "text-ink-subtle"
            }`}
          >
            コース
          </Link>

          {session ? (
            <>
              <Link
                href="/dashboard"
                className={`interactive type-body-sm rounded-md px-3 py-1.5 font-medium hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  current === "dashboard" ? "text-ink" : "text-ink-subtle"
                }`}
              >
                学習ダッシュボード
              </Link>
              <span className="type-body-sm ml-2 hidden max-w-[10rem] truncate text-ink-subtle sm:inline">
                {session.user.name || session.user.email}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="interactive type-body-sm rounded-md px-3 py-1.5 font-medium text-ink-subtle hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className="interactive ml-1 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                新規登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
