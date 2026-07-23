import { getAllCourses } from "@/lib/contentLoader";
import { CourseCard } from "@/components/CourseCard";

export default function Home() {
  const courses = getAllCourses();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Progate Clone</h1>
      <p className="mt-2 text-gray-600">学習したいコースを選んでください。</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
