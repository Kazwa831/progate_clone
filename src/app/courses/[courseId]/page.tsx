import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseById, getLessonById } from "@/lib/contentLoader";
import { getLessonProgressMap, type LessonStatus } from "@/lib/progress";
import { getCurrentUserId } from "@/lib/session";
import { getLessonSequence } from "@/lib/courseNavigation";
import { SiteHeader } from "@/components/SiteHeader";
import { CheckIcon, PlayIcon } from "@/components/icons";

// 進捗は学習の都度変わる動的なデータのため、ビルド時の静的プリレンダリング対象から外す
export const dynamic = "force-dynamic";

type CourseDetailPageProps = {
  params: Promise<{ courseId: string }>;
};

const STATUS_LABEL: Record<LessonStatus, string> = {
  not_started: "未着手",
  in_progress: "学習中",
  completed: "完了",
};

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { courseId } = await params;
  const course = getCourseById(courseId);

  if (!course) {
    notFound();
  }

  // 未ログインでもカリキュラムは見られる。その場合は完了マークが付かない
  const userId = await getCurrentUserId();
  const isLoggedIn = userId !== null;
  const progressMap = await getLessonProgressMap(userId, course.id);
  const sequence = getLessonSequence(course);
  const completedCount = sequence.filter(
    (item) => progressMap.get(item.lessonId)?.status === "completed"
  ).length;
  const progressPercent =
    sequence.length > 0
      ? Math.round((completedCount / sequence.length) * 100)
      : 0;

  // 未完了の最初のレッスンが「次に学ぶべき」レッスン。全部終わっていれば先頭に戻す
  const nextLesson =
    sequence.find(
      (item) => progressMap.get(item.lessonId)?.status !== "completed"
    ) ?? sequence[0];
  const hasStarted = progressMap.size > 0;

  return (
    <div className="min-h-dvh bg-canvas">
      <SiteHeader current="courses" />

      <main className="mx-auto max-w-3xl px-4 sm:px-6">
        <section className="pt-12 pb-14">
          <p className="type-eyebrow text-ink-tertiary">
            {course.chapters.length}章 · {sequence.length}レッスン
          </p>
          <h1 className="type-display mt-3 text-balance text-ink">
            {course.title}
          </h1>
          <p className="type-body mt-4 max-w-xl text-ink-subtle">
            {course.description}
          </p>

          {nextLesson && (
            <div className="elevate-2 mt-8 overflow-hidden rounded-2xl">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-5 sm:p-6">
                <div className="min-w-0">
                  <p className="type-eyebrow text-ink-tertiary">
                    {hasStarted ? "次のレッスン" : "最初のレッスン"}
                  </p>
                  <p className="type-card-title mt-2 truncate text-ink">
                    {nextLesson.title}
                  </p>
                  <p className="type-caption mt-1 text-ink-tertiary">
                    {nextLesson.chapterTitle}
                  </p>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
                  {/* 未ログインの人に「0 / 26 完了」を見せても意味がないため出さない */}
                  {isLoggedIn && (
                    // 狭い画面では横1行、広い画面では従来どおり右寄せの2段
                    <div className="flex items-baseline gap-2 sm:block sm:text-right">
                      <p className="type-metric text-ink">{progressPercent}%</p>
                      <p className="type-caption text-ink-tertiary sm:mt-1">
                        {completedCount} / {sequence.length} 完了
                      </p>
                    </div>
                  )}
                  <Link
                    href={`/courses/${course.id}/lessons/${nextLesson.lessonId}`}
                    className="interactive inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-accent-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    <PlayIcon className="h-4 w-4" />
                    {hasStarted ? "続きから" : "始める"}
                  </Link>
                </div>
              </div>
              {isLoggedIn ? (
                <div className="h-1 w-full bg-surface-3">
                  <div
                    className="h-full bg-highlight transition-[width] duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              ) : (
                <p className="type-caption border-t border-hairline bg-surface-1 px-6 py-3 text-ink-tertiary">
                  レッスンを始めるにはログインが必要です。進捗はアカウントごとに保存されます。
                </p>
              )}
            </div>
          )}
        </section>

        <section className="border-t border-hairline pt-12 pb-24">
          <h2 className="type-headline text-ink">カリキュラム</h2>

          <div className="mt-8 space-y-10">
            {course.chapters.map((chapter, chapterIndex) => {
              const chapterLessons = chapter.lessonIds;
              const chapterDone = chapterLessons.filter(
                (id) => progressMap.get(id)?.status === "completed"
              ).length;
              const chapterComplete = chapterDone === chapterLessons.length;

              return (
                <section key={chapter.id}>
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`type-caption font-semibold tabular-nums ${
                        chapterComplete ? "text-highlight" : "text-ink-tertiary"
                      }`}
                    >
                      {String(chapterIndex + 1).padStart(2, "0")}
                    </span>
                    <h3 className="type-card-title min-w-0 text-ink">
                      {chapter.title}
                    </h3>
                    <span className="type-caption ml-auto shrink-0 text-ink-tertiary tabular-nums">
                      {isLoggedIn
                        ? `${chapterDone} / ${chapterLessons.length}`
                        : `${chapterLessons.length}レッスン`}
                    </span>
                  </div>

                  <ul className="mt-3 divide-y divide-hairline border-t border-hairline">
                    {chapterLessons.map((lessonId) => {
                      const lesson = getLessonById(course.id, lessonId);
                      const status =
                        progressMap.get(lessonId)?.status ?? "not_started";
                      const isCompleted = status === "completed";
                      const isInProgress = status === "in_progress";

                      return (
                        <li key={lessonId}>
                          <Link
                            href={`/courses/${course.id}/lessons/${lessonId}`}
                            className="interactive group flex items-center gap-3 px-2 py-3.5 hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                isCompleted
                                  ? "bg-highlight text-accent-ink"
                                  : isInProgress
                                    ? "border-2 border-highlight"
                                    : "border border-hairline-strong"
                              }`}
                            >
                              {isCompleted && <CheckIcon className="h-3 w-3" />}
                            </span>

                            <span
                              className={`type-body-sm min-w-0 flex-1 truncate ${
                                isCompleted ? "text-ink-subtle" : "text-ink"
                              }`}
                            >
                              {lesson?.title ?? lessonId}
                            </span>

                            {/*
                              学習状況はアカウントごとの情報なので未ログインでは出さない。
                              狭い画面では文字を出さずに左の丸マーカーで示す（レッスン名に幅を渡すため）が、
                              sr-onlyで読み上げには残すので、状態が伝わらなくなることはない
                            */}
                            {isLoggedIn && (
                              <span
                                className={`type-caption shrink-0 sr-only sm:not-sr-only ${
                                  isInProgress
                                    ? "font-medium text-highlight"
                                    : "text-ink-tertiary"
                                }`}
                              >
                                {STATUS_LABEL[status]}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
