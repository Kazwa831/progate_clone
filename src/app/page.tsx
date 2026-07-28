import Link from "next/link";
import { getAllCourses } from "@/lib/contentLoader";
import { getAllCourseProgress } from "@/lib/progress";
import { CourseCard } from "@/components/CourseCard";

// 進捗は学習の都度変わる動的なデータのため、ビルド時の静的プリレンダリング対象から外す
export const dynamic = "force-dynamic";

export default async function Home() {
  const courses = getAllCourses();
  const progressList = await getAllCourseProgress();
  const progressByCourseId = new Map(
    progressList.map((progress) => [progress.courseId, progress])
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Progate Clone</h1>
          <p className="mt-2 text-muted-foreground">
            学習したいコースを選んでください。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          学習ダッシュボード
        </Link>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
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
    </div>
  );
}
