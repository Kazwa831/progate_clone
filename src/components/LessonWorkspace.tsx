"use client";

import { useEffect, useRef, useState } from "react";
import type { Lesson } from "@/types/lesson";
import type { JudgeResult } from "@/lib/judge/types";
import { judgeExercise } from "@/lib/judge/htmlCssJudge";
import {
  JS_RESULT_MESSAGE_TYPE,
  judgeJavaScriptOutput,
  type JsRunResult,
} from "@/lib/judge/javascriptJudge";
import { SlidePanel } from "@/components/SlidePanel";
import { CodeEditor } from "@/components/CodeEditor";
import { PreviewPane } from "@/components/PreviewPane";
import { ResultChecker } from "@/components/ResultChecker";

type LessonWorkspaceProps = {
  courseId: string;
  courseLanguage: string;
  lesson: Lesson;
};

function initialCodeFor(lesson: Lesson, slideIndex: number): string {
  const slide = lesson.slides[slideIndex];
  return slide.type === "exercise" ? slide.starterCode : "";
}

// 正解表示を見せてから次のスライドへ進めるまでの待機時間
const ADVANCE_DELAY_MS = 1000;

function reportProgress(
  courseId: string,
  lessonId: string,
  slideIndex: number,
  totalSlides: number
) {
  const status = slideIndex === totalSlides - 1 ? "completed" : "in_progress";
  fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, lessonId, currentSlide: slideIndex, status }),
  }).catch(() => {
    // ローカル学習ツールのため、進捗保存に失敗しても学習自体は継続できるようにする
  });
}

export function LessonWorkspace({
  courseId,
  courseLanguage,
  lesson,
}: LessonWorkspaceProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [code, setCode] = useState(() => initialCodeFor(lesson, 0));
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [jsRunResult, setJsRunResult] = useState<JsRunResult | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentSlide = lesson.slides[slideIndex];
  const isJavaScript = courseLanguage === "javascript";

  useEffect(() => {
    reportProgress(courseId, lesson.id, 0, lesson.slides.length);
    // レッスンを開いた時点の初回1回だけ記録する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // JavaScriptコースのiframeはallow-same-originを持たないため、実行結果は
  // postMessage経由でのみ受け取れる（htmlCssJudgeのようなcontentDocument直接参照はできない）
  useEffect(() => {
    if (!isJavaScript) return;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== JS_RESULT_MESSAGE_TYPE) return;
      setJsRunResult({ logs: event.data.logs ?? [], error: event.data.error ?? null });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isJavaScript]);

  function goToSlide(nextIndex: number) {
    setSlideIndex(nextIndex);
    setCode(initialCodeFor(lesson, nextIndex));
    setResult(null);
    setJsRunResult(null);
    reportProgress(courseId, lesson.id, nextIndex, lesson.slides.length);
  }

  function handleCheck() {
    if (currentSlide.type !== "exercise") return;

    if (isJavaScript) {
      setResult(
        judgeJavaScriptOutput(
          jsRunResult,
          currentSlide.checkType,
          currentSlide.checkRule
        )
      );
    } else {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) return;
      setResult(
        judgeExercise(iframeDoc, currentSlide.checkType, currentSlide.checkRule)
      );
    }
  }

  // 正解判定後に次のスライドへ自動遷移する（判定方式に関わらず共通の処理）
  useEffect(() => {
    if (!result?.correct || slideIndex >= lesson.slides.length - 1) return;
    const timer = setTimeout(() => goToSlide(slideIndex + 1), ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

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
          <CodeEditor value={code} language={courseLanguage} onChange={setCode} />
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <PreviewPane code={code} language={courseLanguage} ref={iframeRef} />
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
