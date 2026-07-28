import Link from "next/link";
import { getAllCourses } from "@/lib/contentLoader";
import { getAllCourseProgress } from "@/lib/progress";
import { getCurrentUserId } from "@/lib/session";
import { CourseCard } from "@/components/CourseCard";
import { SiteHeader } from "@/components/SiteHeader";
import { PlayIcon } from "@/components/icons";

// 進捗は学習の都度変わる動的なデータのため、ビルド時の静的プリレンダリング対象から外す
export const dynamic = "force-dynamic";

export default async function Home() {
  const courses = getAllCourses();
  // 未ログインでもコースは見られる。その場合は進捗のない状態で表示する
  const progressList = await getAllCourseProgress(await getCurrentUserId());
  const progressByCourseId = new Map(
    progressList.map((progress) => [progress.courseId, progress])
  );

  const totalLessons = progressList.reduce((sum, p) => sum + p.totalLessons, 0);
  const completedLessons = progressList.reduce(
    (sum, p) => sum + p.completedLessons,
    0
  );
  const overallPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // 最後に学習したコースを画面の主役にする。まだ学習していなければ最初のコースを勧める
  const resumeProgress = progressList
    .filter((p) => p.lastStudiedAt !== null)
    .sort((a, b) => b.lastStudiedAt!.getTime() - a.lastStudiedAt!.getTime())[0];
  const resumeCourse = resumeProgress
    ? courses.find((c) => c.id === resumeProgress.courseId)
    : courses[0];
  const resumeHref = resumeProgress
    ? `/courses/${resumeProgress.courseId}/lessons/${resumeProgress.lastStudiedLessonId}`
    : `/courses/${courses[0]?.id}`;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader current="courses" />

      <main className="mx-auto max-w-5xl px-6">
        <section className="pt-16 pb-20 sm:pt-24">
          <p className="type-eyebrow text-ink-tertiary">
            Learn by writing code
          </p>
          <h1 className="type-display mt-4 max-w-2xl text-balance text-ink">
            手を動かしながら、
            <br />
            プログラミングを学ぶ。
          </h1>
          <p className="type-body mt-5 max-w-xl text-ink-subtle">
            解説を読み、コードを書き、その場で動かして確かめる。
            HTML/CSSからSQLまで、{courses.length}コース{totalLessons}レッスン。
          </p>

          {resumeCourse && (
            <div className="elevate-2 mt-10 overflow-hidden rounded-2xl">
              <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div className="min-w-0">
                  <p className="type-eyebrow text-ink-tertiary">
                    {resumeProgress ? "続きから" : "ここから始める"}
                  </p>
                  <p className="type-headline mt-2 truncate text-ink">
                    {resumeCourse.title}
                  </p>
                  {resumeProgress && (
                    <p className="type-body-sm mt-2 text-ink-subtle">
                      {resumeProgress.completedLessons} /{" "}
                      {resumeProgress.totalLessons} レッスン完了
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-6">
                  <div className="text-right">
                    <p className="type-metric text-ink">{overallPercent}%</p>
                    <p className="type-caption mt-1 text-ink-tertiary">
                      全体の進捗
                    </p>
                  </div>
                  <Link
                    href={resumeHref}
                    className="interactive inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-accent-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    <PlayIcon className="h-4 w-4" />
                    {resumeProgress ? "学習を再開する" : "学習を始める"}
                  </Link>
                </div>
              </div>

              <div className="h-1 w-full bg-surface-3">
                <div
                  className="h-full bg-highlight transition-[width] duration-700"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          )}
        </section>

        <section className="border-t border-hairline pt-12 pb-24">
          <div className="flex items-baseline justify-between">
            <h2 className="type-headline text-ink">コース</h2>
            <p className="type-caption text-ink-tertiary">
              {completedLessons} / {totalLessons} レッスン完了
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {courses.map((course) => {
              const progress = progressByCourseId.get(course.id);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  completedLessons={progress?.completedLessons ?? 0}
                  totalLessons={progress?.totalLessons ?? 0}
                  lastStudiedLessonId={progress?.lastStudiedLessonId ?? null}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
