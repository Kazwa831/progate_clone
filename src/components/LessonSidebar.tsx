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
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
        <CheckIcon className="h-2.5 w-2.5" />
      </span>
    );
  }
  return (
    <span
      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
        isCurrent ? "border-primary" : "border-border"
      } ${status === "in_progress" ? "bg-primary/20" : "bg-transparent"}`}
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

  return (
    <nav
      aria-label="レッスン一覧"
      className="hidden h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-card md:flex"
    >
      <div className="shrink-0 border-b border-border p-4">
        <Link
          href="/"
          className="rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← コース一覧
        </Link>
        <Link
          href={`/courses/${course.id}`}
          className="mt-1 block truncate rounded-sm text-sm font-semibold text-card-foreground hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {course.title}
        </Link>
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {totalCompleted} / {totalLessons} レッスン完了
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-1 p-2">
        {course.chapters.map((chapter) => {
          const isCurrentChapter = chapter.lessonIds.includes(currentLessonId);
          return (
            <details key={chapter.id} open={isCurrentChapter}>
              <summary className="cursor-pointer list-none rounded-md px-2 py-2 text-xs font-semibold tracking-wide text-muted-foreground hover:bg-muted">
                {chapter.title}
              </summary>
              <ul className="mt-1 space-y-0.5 pb-2 pl-1">
                {chapter.lessonIds.map((lessonId) => {
                  const status = progressMap.get(lessonId)?.status ?? "not_started";
                  const isCurrent = lessonId === currentLessonId;
                  const lessonTitle =
                    getLessonById(course.id, lessonId)?.title ?? lessonId;
                  return (
                    <li key={lessonId}>
                      <Link
                        href={`/courses/${course.id}/lessons/${lessonId}`}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isCurrent
                            ? "bg-primary/10 font-medium text-primary-text"
                            : "text-card-foreground hover:bg-muted"
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
