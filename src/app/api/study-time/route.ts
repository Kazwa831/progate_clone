import { NextResponse } from "next/server";
import { addStudyTime } from "@/lib/studyTime";
import { getCurrentUserId } from "@/lib/session";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  // 記録の持ち主はセッションから決める。リクエストボディのuserIdは受け取らない
  const userId = await getCurrentUserId();
  if (userId === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, addedSeconds, solvedExercise } = body as {
    date?: unknown;
    addedSeconds?: unknown;
    solvedExercise?: unknown;
  };

  if (
    typeof date !== "string" ||
    !DATE_KEY_PATTERN.test(date) ||
    typeof addedSeconds !== "number" ||
    addedSeconds < 0 ||
    (solvedExercise !== undefined && typeof solvedExercise !== "boolean")
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await addStudyTime(userId, { date, addedSeconds, solvedExercise });
  return NextResponse.json({ ok: true });
}
