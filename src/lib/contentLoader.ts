import fs from "fs";
import path from "path";
import type { Course, Lesson } from "@/types/lesson";

const CONTENT_DIR = path.join(process.cwd(), "content");

function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function getAllCourses(): Course[] {
  const courseIds = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return courseIds.map((courseId) =>
    readJsonFile<Course>(path.join(CONTENT_DIR, courseId, "course.json"))
  );
}

export function getCourseById(courseId: string): Course | null {
  const filePath = path.join(CONTENT_DIR, courseId, "course.json");
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readJsonFile<Course>(filePath);
}

export function getLessonById(
  courseId: string,
  lessonId: string
): Lesson | null {
  const filePath = path.join(
    CONTENT_DIR,
    courseId,
    "lessons",
    `${lessonId}.json`
  );
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readJsonFile<Lesson>(filePath);
}
