import { NextResponse } from "next/server";
import { getAllCourseProgress, updateLessonProgress } from "@/lib/progress";

export async function GET() {
  const progress = await getAllCourseProgress();
  return NextResponse.json(progress);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { courseId, lessonId, currentSlide, status, draftCode } = body as {
    courseId?: unknown;
    lessonId?: unknown;
    currentSlide?: unknown;
    status?: unknown;
    draftCode?: unknown;
  };

  if (
    typeof courseId !== "string" ||
    typeof lessonId !== "string" ||
    typeof currentSlide !== "number" ||
    (status !== "in_progress" && status !== "completed") ||
    (draftCode !== undefined && typeof draftCode !== "string")
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await updateLessonProgress({ courseId, lessonId, currentSlide, status, draftCode });
  return NextResponse.json({ ok: true });
}
