import Link from "next/link";
import { getLearningStatistics } from "@/lib/statistics";
import { StatCard } from "@/components/StatCard";
import { CompletedLessonList } from "@/components/CompletedLessonList";

// 進捗は学習の都度変わる動的なデータのため、ビルド時の静的プリレンダリング対象から外す
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export default async function DashboardPage() {
  const stats = await getLearningStatistics();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/"
        className="rounded-sm text-sm text-primary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← コース一覧に戻る
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">
        学習ダッシュボード
      </h1>
      <p className="mt-2 text-muted-foreground">
        これまでの学習の記録をまとめて確認できます。
      </p>

      <section className="mt-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="完了レッスン"
            value={`${stats.completedLessons} / ${stats.totalLessons}`}
          />
          <StatCard label="全体の進捗" value={`${stats.progressPercent}%`} />
          <StatCard
            label="着手コース"
            value={`${stats.startedCourses} / ${stats.totalCourses}`}
          />
          <StatCard
            label="最終学習日"
            value={stats.lastStudiedAt ? formatDate(stats.lastStudiedAt) : "—"}
            sub={stats.lastStudiedAt ? undefined : "まだ学習の記録がありません"}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">コース別の進捗</h2>
        <div className="mt-4 space-y-3">
          {stats.courses.map((course) => (
            <div
              key={course.courseId}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/courses/${course.courseId}`}
                  className="rounded-sm font-semibold text-card-foreground hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {course.title}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {course.completedLessons} / {course.totalLessons} レッスン完了
                </span>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${course.progressPercent}%` }}
                />
              </div>

              {course.lastStudiedLessonId ? (
                <Link
                  href={`/courses/${course.courseId}/lessons/${course.lastStudiedLessonId}`}
                  className="mt-3 inline-block rounded-sm text-sm text-primary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  続きから →
                </Link>
              ) : (
                course.firstLessonId && (
                  <Link
                    href={`/courses/${course.courseId}/lessons/${course.firstLessonId}`}
                    className="mt-3 inline-block rounded-sm text-sm text-primary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    始める →
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-foreground">完了したレッスン</h2>
        <div className="mt-4">
          <CompletedLessonList entries={stats.completedLessonHistory} />
        </div>
      </section>
    </div>
  );
}
