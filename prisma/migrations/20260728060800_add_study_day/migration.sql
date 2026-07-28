-- CreateTable
CREATE TABLE "StudyDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "studySeconds" INTEGER NOT NULL DEFAULT 0,
    "solvedExercise" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyDay_date_key" ON "StudyDay"("date");
