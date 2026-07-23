import { prisma } from "@/lib/prisma";
import { getAllCourses } from "@/lib/contentLoader";

export type LessonStatus = "not_started" | "in_progress" | "completed";

export type CourseProgressSummary = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
};

function totalLessonsOf(courseId: string): number {
  const course = getAllCourses().find((c) => c.id === courseId);
  if (!course) return 0;
  return course.chapters.reduce((sum, chapter) => sum + chapter.lessonIds.length, 0);
}

export async function getAllCourseProgress(): Promise<CourseProgressSummary[]> {
  const courses = getAllCourses();
  const progressRows = await prisma.courseProgress.findMany();
  const progressByCourseId = new Map(
    progressRows.map((row) => [row.courseId, row])
  );

  return courses.map((course) => {
    const existing = progressByCourseId.get(course.id);
    return {
      courseId: course.id,
      totalLessons: totalLessonsOf(course.id),
      completedLessons: existing?.completedLessons ?? 0,
    };
  });
}

export async function getLessonProgressMap(
  courseId: string
): Promise<Map<string, { status: LessonStatus; currentSlide: number }>> {
  const rows = await prisma.lessonProgress.findMany({ where: { courseId } });
  return new Map(
    rows.map((row) => [
      row.lessonId,
      { status: row.status as LessonStatus, currentSlide: row.currentSlide },
    ])
  );
}

type UpdateLessonProgressInput = {
  courseId: string;
  lessonId: string;
  currentSlide: number;
  status: "in_progress" | "completed";
};

export async function updateLessonProgress(
  input: UpdateLessonProgressInput
): Promise<void> {
  const existing = await prisma.lessonProgress.findUnique({
    where: {
      courseId_lessonId: {
        courseId: input.courseId,
        lessonId: input.lessonId,
      },
    },
  });

  // 一度完了したレッスンは、後でスライドを見返しても未完了へ後退させない
  const nextStatus: LessonStatus =
    input.status === "completed" || existing?.status === "completed"
      ? "completed"
      : "in_progress";

  await prisma.lessonProgress.upsert({
    where: {
      courseId_lessonId: {
        courseId: input.courseId,
        lessonId: input.lessonId,
      },
    },
    create: {
      courseId: input.courseId,
      lessonId: input.lessonId,
      currentSlide: input.currentSlide,
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date() : null,
    },
    update: {
      currentSlide: input.currentSlide,
      status: nextStatus,
      completedAt:
        nextStatus === "completed" ? existing?.completedAt ?? new Date() : null,
    },
  });

  await syncCourseProgress(input.courseId);
}

async function syncCourseProgress(courseId: string): Promise<void> {
  const completedLessons = await prisma.lessonProgress.count({
    where: { courseId, status: "completed" },
  });

  await prisma.courseProgress.upsert({
    where: { courseId },
    create: {
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
