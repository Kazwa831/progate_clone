import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseById, getLessonById } from "@/lib/contentLoader";
import { getLessonProgressMap, type LessonStatus } from "@/lib/progress";
import { CheckIcon } from "@/components/icons";

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

const STATUS_TEXT_CLASS: Record<LessonStatus, string> = {
  not_started: "text-muted-foreground",
  in_progress: "text-primary-text font-medium",
  completed: "text-success-text font-medium",
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
      <Link
        href="/"
        className="rounded-sm text-sm text-primary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← コース一覧に戻る
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">
        {course.title}
      </h1>
      <p className="mt-2 text-muted-foreground">{course.description}</p>

      <div className="mt-8 space-y-4">
        {course.chapters.map((chapter) => (
          <details
            key={chapter.id}
            className="rounded-lg border border-border bg-card p-4"
            open
          >
            <summary className="cursor-pointer rounded-sm font-semibold text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {chapter.title}
            </summary>
            <ul className="mt-3 space-y-1">
              {chapter.lessonIds.map((lessonId) => {
                const lesson = getLessonById(course.id, lessonId);
                const status = progressMap.get(lessonId)?.status ?? "not_started";
                return (
                  <li key={lessonId}>
                    <Link
                      href={`/courses/${course.id}/lessons/${lessonId}`}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>{lesson?.title ?? lessonId}</span>
                      <span
                        className={`flex items-center gap-1 text-xs ${STATUS_TEXT_CLASS[status]}`}
                      >
                        {status === "completed" && (
                          <CheckIcon className="h-3.5 w-3.5" />
                        )}
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
