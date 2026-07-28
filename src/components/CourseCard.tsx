import Link from "next/link";
import type { Course } from "@/types/lesson";

type CourseCardProps = {
  course: Course;
  completedLessons: number;
  totalLessons: number;
  lastStudiedLessonId: string | null;
};

export function CourseCard({
  course,
  completedLessons,
  totalLessons,
  lastStudiedLessonId,
}: CourseCardProps) {
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const started = lastStudiedLessonId !== null;
  const chapterCount = course.chapters.length;

  // カード全体をリンクにすると入れ子のリンクが作れなくなるため、
  // 見出しのリンクを重ねて広げ、カード全体をクリックできるようにしている
  return (
    <article className="interactive lift-on-hover elevate-1 group relative flex flex-col rounded-xl p-6">
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            started ? "bg-highlight" : "bg-ink-tertiary/40"
          }`}
        />
        <p className="type-eyebrow text-ink-tertiary">
          {chapterCount}章 · {totalLessons}レッスン
        </p>
      </div>

      <h3 className="type-card-title mt-3 text-ink">
        <Link
          href={`/courses/${course.id}`}
          className="rounded-sm before:absolute before:inset-0 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {course.title}
        </Link>
      </h3>

      <p className="type-body-sm mt-2 line-clamp-2 text-ink-subtle">
        {course.description}
      </p>

      <div className="mt-auto pt-6">
        {started ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="type-caption text-ink-subtle">
                {completedLessons} / {totalLessons} 完了
              </span>
              <span className="type-caption font-semibold text-ink tabular-nums">
                {progressPercent}%
              </span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-highlight transition-[width] duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        ) : (
          <span className="type-caption text-ink-tertiary">未学習</span>
        )}
      </div>
    </article>
  );
}
