import Link from "next/link";

type SiteHeaderProps = {
  /** 現在地を示すために、該当するリンクを強調する */
  current?: "courses" | "dashboard";
};

export function SiteHeader({ current }: SiteHeaderProps) {
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
          <Link
            href="/dashboard"
            className={`interactive type-body-sm rounded-md px-3 py-1.5 font-medium hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              current === "dashboard" ? "text-ink" : "text-ink-subtle"
            }`}
          >
            学習ダッシュボード
          </Link>
        </nav>
      </div>
    </header>
  );
}
