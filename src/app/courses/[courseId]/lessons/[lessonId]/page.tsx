import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/contentLoader";
import { LessonWorkspace } from "@/components/LessonWorkspace";

type LessonPageProps = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = await params;
  const lesson = getLessonById(courseId, lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b border-gray-200 px-6 py-3">
        <h1 className="text-lg font-semibold text-gray-900">
          {lesson.title}
        </h1>
      </header>
      <div className="min-h-0 flex-1">
        <LessonWorkspace lesson={lesson} />
      </div>
    </div>
  );
}
