import { getLessonById } from "@/lib/contentLoader";
import type { Course } from "@/types/lesson";

export type LessonRef = {
  lessonId: string;
  chapterId: string;
  chapterTitle: string;
  title: string;
};

// 章をまたいだ「コース内の全レッスン」を先頭から並べた一覧を作る。
// 前後のレッスン判定・進捗率の計算など、コース全体を横断する処理はこれを土台にする。
export function getLessonSequence(course: Course): LessonRef[] {
  return course.chapters.flatMap((chapter) =>
    chapter.lessonIds.map((lessonId) => ({
      lessonId,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      title: getLessonById(course.id, lessonId)?.title ?? lessonId,
    }))
  );
}

export type LessonPosition = {
  chapterTitle: string;
  indexInChapter: number;
  totalInChapter: number;
  overallIndex: number;
  totalLessons: number;
  previous: LessonRef | null;
  next: LessonRef | null;
};

export function getLessonPosition(
  course: Course,
  currentLessonId: string
): LessonPosition | null {
  const sequence = getLessonSequence(course);
  const overallIndex = sequence.findIndex(
    (item) => item.lessonId === currentLessonId
  );
  if (overallIndex === -1) return null;

  const current = sequence[overallIndex];
  const chapterLessons = sequence.filter(
    (item) => item.chapterId === current.chapterId
  );
  const indexInChapter = chapterLessons.findIndex(
    (item) => item.lessonId === currentLessonId
  );

  return {
    chapterTitle: current.chapterTitle,
    indexInChapter,
    totalInChapter: chapterLessons.length,
    overallIndex,
    totalLessons: sequence.length,
    previous: overallIndex > 0 ? sequence[overallIndex - 1] : null,
    next:
      overallIndex < sequence.length - 1 ? sequence[overallIndex + 1] : null,
  };
}
