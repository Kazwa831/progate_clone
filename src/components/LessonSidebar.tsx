import Link from "next/link";
import { getLessonById } from "@/lib/contentLoader";
import type { Course } from "@/types/lesson";
import type { LessonStatus } from "@/lib/progress";
import { CheckIcon } from "@/components/icons";

type LessonSidebarProps = {
  course: Course;
  currentLessonId: string;
  progressMap: Map<string, { status: LessonStatus }>;
  totalCompleted: number;
  totalLessons: number;
};

function StatusMarker({
  status,
  isCurrent,
}: {
  status: LessonStatus;
  isCurrent: boolean;
}) {
  if (status === "completed") {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-highlight text-accent-ink">
        <CheckIcon className="h-2.5 w-2.5" />
      </span>
    );
  }
  return (
    <span
      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
        isCurrent ? "border-highlight" : "border-hairline-strong"
      }`}
    />
  );
}

export function LessonSidebar({
  course,
  currentLessonId,
  progressMap,
  totalCompleted,
  totalLessons,
}: LessonSidebarProps) {
  const progressPercent =
    totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  // 学習画面ではコードとプレビューを主役にしたいので、サイドバーは
  // canvasと同じ面に置いて後ろへ下げる（カードのように持ち上げない）
  return (
    <nav
      aria-label="レッスン一覧"
      className="hidden h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-hairline bg-canvas md:flex"
    >
      <div className="shrink-0 border-b border-hairline px-4 py-4">
        <Link
          href="/"
          className="interactive type-caption rounded-sm text-ink-tertiary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← コース一覧
        </Link>
        <Link
          href={`/courses/${course.id}`}
          className="interactive type-body-sm mt-1.5 block truncate rounded-sm font-semibold text-ink hover:text-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {course.title}
        </Link>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="type-caption text-ink-tertiary">
            {totalCompleted} / {totalLessons} 完了
          </span>
          <span className="type-caption font-semibold text-ink tabular-nums">
            {progressPercent}%
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-highlight transition-[width] duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-2 py-3">
        {course.chapters.map((chapter) => {
          const isCurrentChapter = chapter.lessonIds.includes(currentLessonId);
          return (
            <details key={chapter.id} open={isCurrentChapter} className="mb-2">
              <summary className="interactive type-eyebrow cursor-pointer list-none rounded-md px-2 py-2 text-ink-tertiary hover:text-ink-subtle">
                {chapter.title}
              </summary>
              <ul className="mt-1 space-y-0.5 pb-1">
                {chapter.lessonIds.map((lessonId) => {
                  const status =
                    progressMap.get(lessonId)?.status ?? "not_started";
                  const isCurrent = lessonId === currentLessonId;
                  const lessonTitle =
                    getLessonById(course.id, lessonId)?.title ?? lessonId;
                  return (
                    <li key={lessonId}>
                      <Link
                        href={`/courses/${course.id}/lessons/${lessonId}`}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`interactive type-body-sm flex items-center gap-2.5 rounded-md px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isCurrent
                            ? "bg-surface-2 font-medium text-ink"
                            : "text-ink-subtle hover:bg-surface-3 hover:text-ink"
                        }`}
                      >
                        <StatusMarker status={status} isCurrent={isCurrent} />
                        <span className="truncate">{lessonTitle}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </nav>
  );
}
