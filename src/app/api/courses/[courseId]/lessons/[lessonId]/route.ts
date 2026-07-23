import { NextResponse } from "next/server";
import { getLessonById } from "@/lib/contentLoader";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params;
  const lesson = getLessonById(courseId, lessonId);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json(lesson);
}
