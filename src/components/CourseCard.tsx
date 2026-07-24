import Link from "next/link";
import type { Course } from "@/types/lesson";

type CourseCardProps = {
  course: Course;
  completedLessons: number;
  totalLessons: number;
};

export function CourseCard({
  course,
  completedLessons,
  totalLessons,
}: CourseCardProps) {
  const progressPercent =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="block rounded-lg border border-border bg-card p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
  );
}
