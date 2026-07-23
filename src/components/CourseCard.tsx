import Link from "next/link";
import type { Course } from "@/types/lesson";

type CourseCardProps = {
  course: Course;
};

export function CourseCard({ course }: CourseCardProps) {
  const totalLessons = course.chapters.reduce(
    (sum, chapter) => sum + chapter.lessonIds.length,
    0
  );

  return (
    <Link
      href={`/courses/${course.id}`}
      className="block rounded-lg border border-gray-200 p-6 shadow-sm transition hover:shadow-md"
    >
      <h2 className="text-xl font-bold text-gray-900">{course.title}</h2>
      <p className="mt-2 text-sm text-gray-600">{course.description}</p>
      {/* 進捗は0/合計のプレースホルダー表示。実際の進捗連携はステップ6で行う */}
      <p className="mt-4 text-sm text-gray-500">
        0 / {totalLessons} レッスン完了
      </p>
    </Link>
  );
}
