import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseById, getLessonById } from "@/lib/contentLoader";
import { getLessonProgressMap, type LessonStatus } from "@/lib/progress";

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

  const progressMap = await getLessonProgressMap(course.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← コース一覧に戻る
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">
        {course.title}
      </h1>
      <p className="mt-2 text-gray-600">{course.description}</p>

      <div className="mt-8 space-y-4">
        {course.chapters.map((chapter) => (
          <details
            key={chapter.id}
            className="rounded-lg border border-gray-200 p-4"
            open
          >
            <summary className="cursor-pointer font-semibold text-gray-900">
              {chapter.title}
            </summary>
            <ul className="mt-3 space-y-2">
              {chapter.lessonIds.map((lessonId) => {
                const lesson = getLessonById(course.id, lessonId);
                const status = progressMap.get(lessonId)?.status ?? "not_started";
                return (
                  <li key={lessonId}>
                    <Link
                      href={`/courses/${course.id}/lessons/${lessonId}`}
                      className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-gray-50"
                    >
                      <span>{lesson?.title ?? lessonId}</span>
                      <span className="text-xs text-gray-400">
                        {STATUS_LABEL[status]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
