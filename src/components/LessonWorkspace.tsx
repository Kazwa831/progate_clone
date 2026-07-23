"use client";

import { useRef, useState } from "react";
import type { Lesson } from "@/types/lesson";
import type { JudgeResult } from "@/lib/judge/types";
import { judgeExercise } from "@/lib/judge/htmlCssJudge";
import { SlidePanel } from "@/components/SlidePanel";
import { CodeEditor } from "@/components/CodeEditor";
import { PreviewPane } from "@/components/PreviewPane";
import { ResultChecker } from "@/components/ResultChecker";

type LessonWorkspaceProps = {
  lesson: Lesson;
};

function initialCodeFor(lesson: Lesson, slideIndex: number): string {
  const slide = lesson.slides[slideIndex];
  return slide.type === "exercise" ? slide.starterCode : "";
}

// 正解表示を見せてから次のスライドへ進めるまでの待機時間
const ADVANCE_DELAY_MS = 1000;

export function LessonWorkspace({ lesson }: LessonWorkspaceProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [code, setCode] = useState(() => initialCodeFor(lesson, 0));
  const [result, setResult] = useState<JudgeResult | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentSlide = lesson.slides[slideIndex];

  function goToSlide(nextIndex: number) {
    setSlideIndex(nextIndex);
    setCode(initialCodeFor(lesson, nextIndex));
    setResult(null);
  }

  function handleCheck() {
    if (currentSlide.type !== "exercise") return;

    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;

    const judged = judgeExercise(
      iframeDoc,
      currentSlide.checkType,
      currentSlide.checkRule
    );
    setResult(judged);

    if (judged.correct && slideIndex < lesson.slides.length - 1) {
      setTimeout(() => goToSlide(slideIndex + 1), ADVANCE_DELAY_MS);
    }
  }

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
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <PreviewPane code={code} ref={iframeRef} />
          </div>
          {currentSlide.type === "exercise" && (
            <div className="shrink-0 border-t border-gray-200 p-4">
              <ResultChecker
                onCheck={handleCheck}
                result={result}
                hint={currentSlide.hint}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
