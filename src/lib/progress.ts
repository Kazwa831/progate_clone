import { prisma } from "@/lib/prisma";
import { getAllCourses } from "@/lib/contentLoader";

export type LessonStatus = "not_started" | "in_progress" | "completed";

export type CourseProgressSummary = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  /** 「続きから」の遷移先。一度も学習していないコースはnull */
  lastStudiedLessonId: string | null;
  /** 最後に学習した日時。どのコースを主役として見せるかの判断に使う */
  lastStudiedAt: Date | null;
};

function totalLessonsOf(courseId: string): number {
  const course = getAllCourses().find((c) => c.id === courseId);
  if (!course) return 0;
  return course.chapters.reduce((sum, chapter) => sum + chapter.lessonIds.length, 0);
}

/**
 * コースごとの進捗。
 *
 * コース一覧は未ログインでも見られる画面のため、userIdがnullでも呼べる。
 * その場合もレッスン数など教材由来の情報は返し、進捗だけを空にする。
 */
export async function getAllCourseProgress(
  userId: string | null
): Promise<CourseProgressSummary[]> {
  const courses = getAllCourses();

  if (userId === null) {
    return courses.map((course) => ({
      courseId: course.id,
      totalLessons: totalLessonsOf(course.id),
      completedLessons: 0,
      lastStudiedLessonId: null,
      lastStudiedAt: null,
    }));
  }

  const progressRows = await prisma.courseProgress.findMany({ where: { userId } });
  const progressByCourseId = new Map(
    progressRows.map((row) => [row.courseId, row])
  );

  // 更新が新しい順に並べ、コースごとに最初に見つかった1件がそのコースで
  // 最後に学習したレッスンになる
  const lessonRows = await prisma.lessonProgress.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  const lastStudiedByCourseId = new Map<string, { lessonId: string; at: Date }>();
  for (const row of lessonRows) {
    if (!lastStudiedByCourseId.has(row.courseId)) {
      lastStudiedByCourseId.set(row.courseId, {
        lessonId: row.lessonId,
        at: row.updatedAt,
      });
    }
  }

  return courses.map((course) => {
    const existing = progressByCourseId.get(course.id);
    const lastStudied = lastStudiedByCourseId.get(course.id);
    return {
      courseId: course.id,
      totalLessons: totalLessonsOf(course.id),
      completedLessons: existing?.completedLessons ?? 0,
      lastStudiedLessonId: lastStudied?.lessonId ?? null,
      lastStudiedAt: lastStudied?.at ?? null,
    };
  });
}

export type LessonProgressEntry = {
  status: LessonStatus;
  currentSlide: number;
  draftCode: string | null;
};

/** 未ログイン（userIdがnull）の場合は、進捗なしとして空のMapを返す */
export async function getLessonProgressMap(
  userId: string | null,
  courseId: string
): Promise<Map<string, LessonProgressEntry>> {
  if (userId === null) return new Map();

  const rows = await prisma.lessonProgress.findMany({
    where: { userId, courseId },
  });
  return new Map(
    rows.map((row) => [
      row.lessonId,
      {
        status: row.status as LessonStatus,
        currentSlide: row.currentSlide,
        draftCode: row.draftCode,
      },
    ])
  );
}

type UpdateLessonProgressInput = {
  courseId: string;
  lessonId: string;
  currentSlide: number;
  status: "in_progress" | "completed";
  draftCode?: string;
};

/**
 * 進捗を保存する。
 *
 * userIdは呼び出し元がセッションから解決した値を渡すこと。リクエストボディ由来の
 * 値を渡すと、他人のIDを送るだけで他人の進捗を書き換えられてしまう。
 */
export async function updateLessonProgress(
  userId: string,
  input: UpdateLessonProgressInput
): Promise<void> {
  const key = {
    userId_courseId_lessonId: {
      userId,
      courseId: input.courseId,
      lessonId: input.lessonId,
    },
  };

  const existing = await prisma.lessonProgress.findUnique({ where: key });

  // 一度完了したレッスンは、後でスライドを見返しても未完了へ後退させない
  const nextStatus: LessonStatus =
    input.status === "completed" || existing?.status === "completed"
      ? "completed"
      : "in_progress";

  await prisma.lessonProgress.upsert({
    where: key,
    create: {
      userId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      currentSlide: input.currentSlide,
      status: nextStatus,
      draftCode: input.draftCode ?? null,
      completedAt: nextStatus === "completed" ? new Date() : null,
    },
    update: {
      currentSlide: input.currentSlide,
      status: nextStatus,
      // 下書きは常に「今いるスライドの内容」として currentSlide と一緒に送られてくる。
      // 古いスライドの下書きが残ると復元時に別スライドのコードが出てしまうため、
      // 送られてこなかった場合は保持せずに消す
      draftCode: input.draftCode ?? null,
      completedAt:
        nextStatus === "completed" ? existing?.completedAt ?? new Date() : null,
    },
  });

  await syncCourseProgress(userId, input.courseId);
}

async function syncCourseProgress(
  userId: string,
  courseId: string
): Promise<void> {
  const completedLessons = await prisma.lessonProgress.count({
    where: { userId, courseId, status: "completed" },
  });

  await prisma.courseProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      totalLessons: totalLessonsOf(courseId),
      completedLessons,
    },
    update: {
      totalLessons: totalLessonsOf(courseId),
      completedLessons,
    },
  });
}
