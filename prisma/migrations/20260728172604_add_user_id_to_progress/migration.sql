/*
  Warnings:

  - Added the required column `userId` to the `CourseProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `LessonProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `StudyDay` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CourseProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "totalLessons" INTEGER NOT NULL,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CourseProgress" ("completedLessons", "courseId", "id", "totalLessons", "updatedAt") SELECT "completedLessons", "courseId", "id", "totalLessons", "updatedAt" FROM "CourseProgress";
DROP TABLE "CourseProgress";
ALTER TABLE "new_CourseProgress" RENAME TO "CourseProgress";
CREATE INDEX "CourseProgress_userId_idx" ON "CourseProgress"("userId");
CREATE UNIQUE INDEX "CourseProgress_userId_courseId_key" ON "CourseProgress"("userId", "courseId");
CREATE TABLE "new_LessonProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "currentSlide" INTEGER NOT NULL DEFAULT 0,
    "draftCode" TEXT,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LessonProgress" ("completedAt", "courseId", "currentSlide", "draftCode", "id", "lessonId", "status", "updatedAt") SELECT "completedAt", "courseId", "currentSlide", "draftCode", "id", "lessonId", "status", "updatedAt" FROM "LessonProgress";
DROP TABLE "LessonProgress";
ALTER TABLE "new_LessonProgress" RENAME TO "LessonProgress";
CREATE INDEX "LessonProgress_userId_idx" ON "LessonProgress"("userId");
CREATE UNIQUE INDEX "LessonProgress_userId_courseId_lessonId_key" ON "LessonProgress"("userId", "courseId", "lessonId");
CREATE TABLE "new_StudyDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "studySeconds" INTEGER NOT NULL DEFAULT 0,
    "solvedExercise" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StudyDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudyDay" ("date", "id", "solvedExercise", "studySeconds") SELECT "date", "id", "solvedExercise", "studySeconds" FROM "StudyDay";
DROP TABLE "StudyDay";
ALTER TABLE "new_StudyDay" RENAME TO "StudyDay";
CREATE INDEX "StudyDay_userId_idx" ON "StudyDay"("userId");
CREATE UNIQUE INDEX "StudyDay_userId_date_key" ON "StudyDay"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
