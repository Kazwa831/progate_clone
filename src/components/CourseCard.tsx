import Link from "next/link";
import type { Course } from "@/types/lesson";
import { PlayIcon } from "@/components/icons";

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
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

  // 「続きから」はカード全体のリンクと並べて置く。リンクの中にリンクを
  // 入れると正しいHTMLにならないため、入れ子にはしない
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <Link
        href={`/courses/${course.id}`}
        className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <h2 className="text-xl font-bold text-card-foreground">
          {course.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {course.description}
        </p>

        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {completedLessons} / {totalLessons} レッスン完了
          </p>
        </div>
      </Link>

      {lastStudiedLessonId && (
        <Link
          href={`/courses/${course.id}/lessons/${lastStudiedLessonId}`}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PlayIcon className="h-4 w-4" />
          続きから
        </Link>
      )}
    </div>
  );
}
