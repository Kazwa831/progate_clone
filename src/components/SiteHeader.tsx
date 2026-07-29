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
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="type-card-title flex min-h-11 shrink-0 items-center truncate rounded-sm text-ink sm:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Progate Clone
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/*
            狭い画面では「コース」を出さない。ロゴがコース一覧への
            リンクを兼ねているため、無いと辿れなくなる導線ではない
          */}
          <Link
            href="/"
            className={`interactive type-body-sm hidden min-h-11 items-center whitespace-nowrap rounded-md px-3 py-1.5 font-medium sm:min-h-0 hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block ${
              current === "courses" ? "text-ink" : "text-ink-subtle"
            }`}
          >
            コース
          </Link>

          {session ? (
            <>
              <Link
                href="/dashboard"
                className={`interactive type-body-sm flex min-h-11 items-center whitespace-nowrap rounded-md px-3 py-1.5 font-medium hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 ${
                  current === "dashboard" ? "text-ink" : "text-ink-subtle"
                }`}
              >
                {/* 狭い画面では収まらないため短い表記にする */}
                <span className="sm:hidden">記録</span>
                <span className="hidden sm:inline">学習ダッシュボード</span>
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
                className="interactive type-body-sm flex min-h-11 items-center whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-ink-subtle sm:min-h-0 hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className="interactive ml-0.5 flex min-h-11 items-center whitespace-nowrap rounded-md bg-accent px-3.5 py-1.5 sm:min-h-0 text-sm font-medium text-accent-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:ml-1"
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
