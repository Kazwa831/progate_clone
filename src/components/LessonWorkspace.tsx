"use client";

import { useState } from "react";
import type { Lesson } from "@/types/lesson";
import { SlidePanel } from "@/components/SlidePanel";
import { CodeEditor } from "@/components/CodeEditor";
import { PreviewPane } from "@/components/PreviewPane";

type LessonWorkspaceProps = {
  lesson: Lesson;
};

function initialCodeFor(lesson: Lesson, slideIndex: number): string {
  const slide = lesson.slides[slideIndex];
  return slide.type === "exercise" ? slide.starterCode : "";
}

export function LessonWorkspace({ lesson }: LessonWorkspaceProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [code, setCode] = useState(() => initialCodeFor(lesson, 0));

  function goToSlide(nextIndex: number) {
    setSlideIndex(nextIndex);
    setCode(initialCodeFor(lesson, nextIndex));
  }

  const currentSlide = lesson.slides[slideIndex];

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-2">
      <div className="min-h-0 border-b border-gray-200 md:border-b-0 md:border-r">
        <SlidePanel
          slide={currentSlide}
          currentIndex={slideIndex}
          totalSlides={lesson.slides.length}
          onPrev={() => goToSlide(Math.max(0, slideIndex - 1))}
          onNext={() =>
            goToSlide(Math.min(lesson.slides.length - 1, slideIndex + 1))
          }
        />
      </div>
      <div className="grid min-h-0 grid-rows-2">
        <div className="min-h-0 border-b border-gray-200">
          <CodeEditor value={code} onChange={setCode} />
        </div>
        <div className="min-h-0">
          <PreviewPane code={code} />
        </div>
      </div>
    </div>
  );
}
