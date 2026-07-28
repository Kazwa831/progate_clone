import { NextResponse } from "next/server";
import { getAllCourseProgress, updateLessonProgress } from "@/lib/progress";
import { getCurrentUserId } from "@/lib/session";

export async function GET() {
  const userId = await getCurrentUserId();
  if (userId === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progress = await getAllCourseProgress(userId);
  return NextResponse.json(progress);
}

export async function POST(request: Request) {
  // 進捗の持ち主はセッションから決める。リクエストボディにuserIdが入っていても
  // 受け取らない（他人のIDを送るだけで他人の進捗を書き換えられてしまうため）
  const userId = await getCurrentUserId();
  if (userId === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  await updateLessonProgress(userId, {
    courseId,
    lessonId,
    currentSlide,
    status,
    draftCode,
  });
  return NextResponse.json({ ok: true });
}
