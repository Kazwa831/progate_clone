import { notFound, redirect } from "next/navigation";
import { getCourseById, getLessonById } from "@/lib/contentLoader";
import { getLessonProgressMap } from "@/lib/progress";
import { getCurrentUserId } from "@/lib/session";
import { loginUrlFor } from "@/lib/callbackUrl";
import { getLessonPosition } from "@/lib/courseNavigation";
import { defaultCodeForSlide } from "@/lib/lessonCode";
import { LessonWorkspace } from "@/components/LessonWorkspace";
import { LessonSidebar } from "@/components/LessonSidebar";

type LessonPageProps = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = await params;
  const course = getCourseById(courseId);
  const lesson = getLessonById(courseId, lessonId);
  const position = course ? getLessonPosition(course, lessonId) : null;

  if (!course || !lesson || !position) {
    notFound();
  }

  // 学習画面は進捗の保存を伴うため、ログインしていなければ開けない。
  // ログイン後はこのレッスンに戻す
  const userId = await getCurrentUserId();
  if (userId === null) {
    redirect(loginUrlFor(`/courses/${courseId}/lessons/${lessonId}`));
  }

  const progressMap = await getLessonProgressMap(userId, courseId);
  const totalCompleted = Array.from(progressMap.values()).filter(
    (p) => p.status === "completed"
  ).length;

  // 学習途中のレッスンは中断した位置から再開する。完了済みのレッスンは
  // 「再開」ではなく復習として開くものなので先頭から表示する。
  // 教材JSONを編集してスライドが減っている場合に備え、存在する範囲に収める。
  const savedProgress = progressMap.get(lessonId);
  const initialSlideIndex =
    savedProgress?.status === "in_progress"
      ? Math.min(savedProgress.currentSlide, lesson.slides.length - 1)
      : 0;

  // 書きかけコードは保存時のスライドとセットでのみ意味を持つ。開く位置が
  // ずれている場合（完了済みで先頭に戻す時や、教材のスライドが減った時）は
  // 別スライドの内容を復元してしまわないよう、そのスライドの初期コードを使う
  const restorableDraft =
    savedProgress?.draftCode != null &&
    savedProgress.currentSlide === initialSlideIndex
      ? savedProgress.draftCode
      : null;
  const initialCode =
    restorableDraft ?? defaultCodeForSlide(lesson, initialSlideIndex);

  return (
    <div className="flex h-dvh bg-canvas">
      <LessonSidebar
        course={course}
        currentLessonId={lessonId}
        progressMap={progressMap}
        totalCompleted={totalCompleted}
        totalLessons={position.totalLessons}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-hairline bg-canvas px-6 py-3.5">
          <p className="type-eyebrow text-ink-tertiary">
            {position.chapterTitle} ・ {position.indexInChapter + 1} /{" "}
            {position.totalInChapter}
          </p>
          <h1 className="type-card-title mt-1 text-ink">{lesson.title}</h1>
        </header>
        <div className="min-h-0 flex-1">
          <LessonWorkspace
            key={lesson.id}
            courseId={courseId}
            courseLanguage={course.language}
            lesson={lesson}
            previousLesson={position.previous}
            nextLesson={position.next}
            initialSlideIndex={initialSlideIndex}
            initialCode={initialCode}
          />
        </div>
      </div>
    </div>
  );
}
