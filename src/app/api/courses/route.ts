import { NextResponse } from "next/server";
import { getAllCourses } from "@/lib/contentLoader";

export async function GET() {
  const courses = getAllCourses();
  return NextResponse.json(courses);
}
