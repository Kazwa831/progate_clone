import { prisma } from "@/lib/prisma";
import { getAllCourses } from "@/lib/contentLoader";
import { getLessonSequence } from "@/lib/courseNavigation";

export type CourseStatistics = {
  courseId: string;
  title: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  /** 「続きから」の遷移先。未着手のコースはnull */
  lastStudiedLessonId: string | null;
  /** 未着手のコースで「始める」の遷移先に使う */
  firstLessonId: string | null;
};

export type CompletedLessonEntry = {
  courseTitle: string;
  chapterTitle: string;
  lessonTitle: string;
  completedAt: Date;
};

export type LearningStatistics = {
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  startedCourses: number;
  totalCourses: number;
  /** 最後に学習した日時。一度も学習していなければnull */
  lastStudiedAt: Date | null;
  courses: CourseStatistics[];
  /** 完了したレッスンを新しい順に並べたもの */
  completedLessonHistory: CompletedLessonEntry[];
};

/**
 * 学習ダッシュボード用の集計。
 *
 * 記録済みのデータから正確に出せる指標だけを扱う。学習時間や実際に解いた
 * 演習数は現状のスキーマからは正確に求められないため、ここでは扱わない
 * （演習は「次へ」で飛ばせるため、完了レッスンの演習数を数えると実際より多くなる）。
 */
export async function getLearningStatistics(): Promise<LearningStatistics> {
  const courses = getAllCourses();
  const rows = await prisma.lessonProgress.findMany();

  const rowsByCourseId = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = rowsByCourseId.get(row.courseId) ?? [];
    list.push(row);
    rowsByCourseId.set(row.courseId, list);
  }

  const courseStatistics: CourseStatistics[] = [];
  const completedLessonHistory: CompletedLessonEntry[] = [];

  for (const course of courses) {
    const sequence = getLessonSequence(course);
    const courseRows = rowsByCourseId.get(course.id) ?? [];
    const completedRows = courseRows.filter((row) => row.status === "completed");

    const lastStudiedRow = [...courseRows].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0];

    courseStatistics.push({
      courseId: course.id,
      title: course.title,
      completedLessons: completedRows.length,
      totalLessons: sequence.length,
      progressPercent:
        sequence.length > 0
          ? Math.round((completedRows.length / sequence.length) * 100)
          : 0,
      lastStudiedLessonId: lastStudiedRow?.lessonId ?? null,
      firstLessonId: sequence[0]?.lessonId ?? null,
    });

    const lessonRefById = new Map(sequence.map((item) => [item.lessonId, item]));
    for (const row of completedRows) {
      const lessonRef = lessonRefById.get(row.lessonId);
      // 教材から削除されたレッスンの記録が残っていても一覧には出さない
      if (!lessonRef || !row.completedAt) continue;
      completedLessonHistory.push({
        courseTitle: course.title,
        chapterTitle: lessonRef.chapterTitle,
        lessonTitle: lessonRef.title,
        completedAt: row.completedAt,
      });
    }
  }

  completedLessonHistory.sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
  );

  const totalLessons = courseStatistics.reduce(
    (sum, course) => sum + course.totalLessons,
    0
  );
  const completedLessons = courseStatistics.reduce(
    (sum, course) => sum + course.completedLessons,
    0
  );
  const lastStudiedAt = rows.reduce<Date | null>(
    (latest, row) =>
      latest === null || row.updatedAt > latest ? row.updatedAt : latest,
    null
  );

  return {
    completedLessons,
    totalLessons,
    progressPercent:
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    startedCourses: courses.filter(
      (course) => (rowsByCourseId.get(course.id) ?? []).length > 0
    ).length,
    totalCourses: courses.length,
    lastStudiedAt,
    courses: courseStatistics,
    completedLessonHistory,
  };
}
