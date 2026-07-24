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
      <h1 className="text-3xl font-bold text-foreground">Progate Clone</h1>
      <p className="mt-2 text-muted-foreground">
        学習したいコースを選んでください。
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {courses.map((course) => {
          const progress = progressByCourseId.get(course.id);
          return (
            <CourseCard
              key={course.id}
              course={course}
              completedLessons={progress?.completedLessons ?? 0}
              totalLessons={progress?.totalLessons ?? 0}
            />
          );
        })}
      </div>
    </div>
  );
}
