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
  return (
    <Link
      href={`/courses/${course.id}`}
      className="block rounded-lg border border-gray-200 p-6 shadow-sm transition hover:shadow-md"
    >
      <h2 className="text-xl font-bold text-gray-900">{course.title}</h2>
      <p className="mt-2 text-sm text-gray-600">{course.description}</p>
      <p className="mt-4 text-sm text-gray-500">
        {completedLessons} / {totalLessons} レッスン完了
      </p>
    </Link>
  );
}
