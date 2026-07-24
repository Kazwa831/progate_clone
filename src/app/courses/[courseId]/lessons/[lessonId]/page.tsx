import { notFound } from "next/navigation";
import { getCourseById, getLessonById } from "@/lib/contentLoader";
import { getLessonProgressMap } from "@/lib/progress";
import { getLessonPosition } from "@/lib/courseNavigation";
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

  const progressMap = await getLessonProgressMap(courseId);
  const totalCompleted = Array.from(progressMap.values()).filter(
    (p) => p.status === "completed"
  ).length;

  return (
    <div className="flex h-screen">
      <LessonSidebar
        course={course}
        currentLessonId={lessonId}
        progressMap={progressMap}
        totalCompleted={totalCompleted}
        totalLessons={position.totalLessons}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-border bg-card px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {position.chapterTitle} ・ {position.indexInChapter + 1} /{" "}
            {position.totalInChapter}
          </p>
          <h1 className="text-lg font-semibold text-card-foreground">
            {lesson.title}
          </h1>
        </header>
        <div className="min-h-0 flex-1">
          <LessonWorkspace
            key={lesson.id}
            courseId={courseId}
            courseLanguage={course.language}
            lesson={lesson}
            previousLesson={position.previous}
            nextLesson={position.next}
          />
        </div>
      </div>
    </div>
  );
}
