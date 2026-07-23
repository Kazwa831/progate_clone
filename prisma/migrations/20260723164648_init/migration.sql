-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "currentSlide" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CourseProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "courseId" TEXT NOT NULL,
    "totalLessons" INTEGER NOT NULL,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_courseId_lessonId_key" ON "LessonProgress"("courseId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_courseId_key" ON "CourseProgress"("courseId");
