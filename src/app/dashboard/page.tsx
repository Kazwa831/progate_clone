import Link from "next/link";
import { redirect } from "next/navigation";
import { getLearningStatistics } from "@/lib/statistics";
import { getCurrentUserId } from "@/lib/session";
import { SiteHeader } from "@/components/SiteHeader";
import { StatCard } from "@/components/StatCard";
import { StreakBadges } from "@/components/StreakBadges";
import { CompletedLessonList } from "@/components/CompletedLessonList";

// 進捗は学習の都度変わる動的なデータのため、ビルド時の静的プリレンダリング対象から外す
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatStudyTime(totalSeconds: number): {
  value: string;
  unit: string;
} {
  if (totalSeconds < 60) return { value: "0", unit: "分" };
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return { value: String(minutes), unit: "分" };
  return { value: `${hours}`, unit: `時間 ${minutes}分` };
}

export default async function DashboardPage() {
  // 個人の学習記録を表示する画面なので、ログインしていなければ見せない
  const userId = await getCurrentUserId();
  if (userId === null) {
    redirect("/login");
  }

  const stats = await getLearningStatistics(userId);
  const studyTime = formatStudyTime(stats.studySummary.totalStudySeconds);

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader current="dashboard" />

      <main className="mx-auto max-w-4xl px-6">
        <section className="pt-12 pb-12">
          <p className="type-eyebrow text-ink-tertiary">Your progress</p>
          <h1 className="type-display mt-3 text-ink">学習ダッシュボード</h1>

          {/* 学習時間と連続日数をこの画面の主役にする */}
          <div className="elevate-2 mt-8 grid gap-px overflow-hidden rounded-2xl bg-hairline sm:grid-cols-2">
            <div className="bg-surface-2 p-7">
              <p className="type-eyebrow text-ink-tertiary">学習時間（目安）</p>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="type-display text-ink tabular-nums">
                  {studyTime.value}
                </span>
                <span className="type-card-title text-ink-subtle">
                  {studyTime.unit}
                </span>
              </p>
              <p className="type-caption mt-2 text-ink-tertiary">
                タブを開いて操作している時間の概算です
              </p>
            </div>

            <div className="bg-surface-2 p-7">
              <p className="type-eyebrow text-ink-tertiary">連続学習日数</p>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="type-display text-ink tabular-nums">
                  {stats.studySummary.currentStreak}
                </span>
                <span className="type-card-title text-ink-subtle">日</span>
                {stats.studySummary.currentStreak > 0 && (
                  <span className="ml-1 text-2xl" aria-hidden="true">
                    🔥
                  </span>
                )}
              </p>
              <p className="type-caption mt-2 text-ink-tertiary">
                最長 {stats.studySummary.longestStreak}日
              </p>
            </div>
          </div>

          <div className="mt-5">
            <StreakBadges longestStreak={stats.studySummary.longestStreak} />
          </div>
        </section>

        <section className="border-t border-hairline pt-10">
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
              sub={stats.lastStudiedAt ? undefined : "記録がありません"}
            />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="type-headline text-ink">コース別の進捗</h2>
          <div className="mt-6 divide-y divide-hairline border-t border-hairline">
            {stats.courses.map((course) => (
              <div key={course.courseId} className="py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/courses/${course.courseId}`}
                    className="interactive type-card-title rounded-sm text-ink hover:text-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {course.title}
                  </Link>
                  <span className="type-caption text-ink-tertiary tabular-nums">
                    {course.completedLessons} / {course.totalLessons} 完了 ·{" "}
                    {course.progressPercent}%
                  </span>
                </div>

                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-highlight transition-[width] duration-700"
                    style={{ width: `${course.progressPercent}%` }}
                  />
                </div>

                {course.lastStudiedLessonId ? (
                  <Link
                    href={`/courses/${course.courseId}/lessons/${course.lastStudiedLessonId}`}
                    className="interactive type-body-sm mt-3 inline-block rounded-sm font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    続きから →
                  </Link>
                ) : (
                  course.firstLessonId && (
                    <Link
                      href={`/courses/${course.courseId}/lessons/${course.firstLessonId}`}
                      className="interactive type-body-sm mt-3 inline-block rounded-sm font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      始める →
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 pb-24">
          <h2 className="type-headline text-ink">完了したレッスン</h2>
          <div className="mt-6">
            <CompletedLessonList entries={stats.completedLessonHistory} />
          </div>
        </section>
      </main>
    </div>
  );
}
