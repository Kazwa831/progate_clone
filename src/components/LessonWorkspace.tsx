"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lesson } from "@/types/lesson";
import type { JudgeResult } from "@/lib/judge/types";
import type { LessonRef } from "@/lib/courseNavigation";
import { judgeExercise } from "@/lib/judge/htmlCssJudge";
import {
  JS_RESULT_MESSAGE_TYPE,
  judgeJavaScriptOutput,
  type JsRunResult,
} from "@/lib/judge/javascriptJudge";
import {
  PYTHON_READY_MESSAGE_TYPE,
  PYTHON_RESULT_MESSAGE_TYPE,
  PYTHON_RUN_MESSAGE_TYPE,
  judgePythonOutput,
  type PyRunResult,
} from "@/lib/judge/pythonJudge";
import { SlidePanel } from "@/components/SlidePanel";
import { CodeEditor } from "@/components/CodeEditor";
import { PreviewPane } from "@/components/PreviewPane";
import { ResultChecker } from "@/components/ResultChecker";
import { EyeIcon, PlayIcon } from "@/components/icons";

type LessonWorkspaceProps = {
  courseId: string;
  courseLanguage: string;
  lesson: Lesson;
  previousLesson: LessonRef | null;
  nextLesson: LessonRef | null;
};

function initialCodeFor(lesson: Lesson, slideIndex: number): string {
  const slide = lesson.slides[slideIndex];
  if (slide.type === "exercise") return slide.starterCode;
  if (slide.type === "example") return slide.code;
  return "";
}

function editorFileNameFor(language: string): string {
  if (language === "javascript") return "script.js";
  if (language === "python") return "main.py";
  return "index.html";
}

// 正解表示を見せてから次のスライドへ進めるまでの待機時間
const ADVANCE_DELAY_MS = 1000;

function reportProgress(
  courseId: string,
  lessonId: string,
  slideIndex: number,
  status: "in_progress" | "completed"
) {
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
  previousLesson,
  nextLesson,
}: LessonWorkspaceProps) {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [code, setCode] = useState(() => initialCodeFor(lesson, 0));
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [jsRunResult, setJsRunResult] = useState<JsRunResult | null>(null);
  const [pyodideReady, setPyodideReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // 判定待ちの実行かどうか（「実行して確認する」経由か、ただの「実行してみる」かを区別する）
  const pendingJudgeRef = useRef(false);

  const currentSlide = lesson.slides[slideIndex];
  const isJavaScript = courseLanguage === "javascript";
  const isPython = courseLanguage === "python";
  const isFirstSlide = slideIndex === 0;
  const isLastSlide = slideIndex === lesson.slides.length - 1;

  useEffect(() => {
    reportProgress(courseId, lesson.id, 0, "in_progress");
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

  // handleMessageの中から常に最新のスライド状態を読めるようにrefで追随させる。
  // （postMessageのリスナー自体は下のuseEffectでレッスン表示中ずっと張りっぱなしにするため、
  // スライドを切り替えるたびに購読し直すと、その一瞬の間にPyodideの準備完了通知を
  // 取りこぼす恐れがある。リスナーは固定し、参照する値だけをrefで最新化する）
  const latestSlideStateRef = useRef({ currentSlide, slideIndex, isLastSlide });
  useEffect(() => {
    latestSlideStateRef.current = { currentSlide, slideIndex, isLastSlide };
  }, [currentSlide, slideIndex, isLastSlide]);

  // Pythonコースは、Pyodideの読み込み完了通知と、実行結果の両方をpostMessageで受け取る。
  // 読み込みは初回の1回だけで、以後はスライドを切り替えても同じiframe(=同じPyodide)を使い回す。
  useEffect(() => {
    if (!isPython) return;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === PYTHON_READY_MESSAGE_TYPE) {
        setPyodideReady(true);
        return;
      }
      if (event.data?.type === PYTHON_RESULT_MESSAGE_TYPE) {
        const runResult: PyRunResult = {
          logs: event.data.logs ?? [],
          variables: event.data.variables ?? {},
          error: event.data.error ?? null,
        };
        if (pendingJudgeRef.current) {
          pendingJudgeRef.current = false;
          const { currentSlide: slide, slideIndex: index, isLastSlide: isLast } =
            latestSlideStateRef.current;
          const judged = judgePythonOutput(
            runResult,
            slide.type === "exercise" ? slide.checkType : "",
            slide.type === "exercise" ? slide.checkRule : {}
          );
          setResult(judged);
          if (judged.correct) {
            reportProgress(courseId, lesson.id, index, isLast ? "completed" : "in_progress");
          }
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isPython, courseId, lesson.id]);

  function goToSlide(nextIndex: number) {
    setSlideIndex(nextIndex);
    setCode(initialCodeFor(lesson, nextIndex));
    setResult(null);
    setJsRunResult(null);
    pendingJudgeRef.current = false;
    reportProgress(courseId, lesson.id, nextIndex, "in_progress");
  }

  function handlePrev() {
    if (!isFirstSlide) {
      goToSlide(slideIndex - 1);
      return;
    }
    if (previousLesson) {
      router.push(`/courses/${courseId}/lessons/${previousLesson.lessonId}`);
    } else {
      router.push(`/courses/${courseId}`);
    }
  }

  function handleNext() {
    if (!isLastSlide) {
      goToSlide(slideIndex + 1);
      return;
    }
    if (nextLesson) {
      router.push(`/courses/${courseId}/lessons/${nextLesson.lessonId}`);
    }
  }

  function handleReset() {
    setCode(initialCodeFor(lesson, slideIndex));
    setResult(null);
  }

  function handleRunPython() {
    if (!pyodideReady) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: PYTHON_RUN_MESSAGE_TYPE, code },
      "*"
    );
  }

  function handleCheck() {
    if (currentSlide.type !== "exercise") return;

    if (isPython) {
      pendingJudgeRef.current = true;
      handleRunPython();
      return;
    }

    let judged: JudgeResult;
    if (isJavaScript) {
      judged = judgeJavaScriptOutput(
        jsRunResult,
        currentSlide.checkType,
        currentSlide.checkRule
      );
    } else {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) return;
      judged = judgeExercise(
        iframeDoc,
        currentSlide.checkType,
        currentSlide.checkRule
      );
    }

    setResult(judged);

    // 進捗の「完了」は、最後のスライドの問題に正解したときだけ記録する
    // （単にスライドを送っただけで完了扱いにならないようにするため）
    if (judged.correct) {
      reportProgress(
        courseId,
        lesson.id,
        slideIndex,
        isLastSlide ? "completed" : "in_progress"
      );
    }
  }

  // 正解判定後、次のスライドへ（レッスンの最後なら次のレッスンへ）自動遷移する
  useEffect(() => {
    if (!result?.correct) return;

    if (!isLastSlide) {
      const timer = setTimeout(() => goToSlide(slideIndex + 1), ADVANCE_DELAY_MS);
      return () => clearTimeout(timer);
    }

    if (nextLesson) {
      const timer = setTimeout(() => {
        router.push(`/courses/${courseId}/lessons/${nextLesson.lessonId}`);
      }, ADVANCE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const prevLabel = !isFirstSlide
    ? "← 前へ"
    : previousLesson
      ? "← 前のレッスンへ"
      : "← コースに戻る";

  const nextLabel = !isLastSlide
    ? "次へ →"
    : nextLesson
      ? "次のレッスンへ →"
      : "次へ →";

  const nextDisabled = isLastSlide && !nextLesson;

  return (
    <div className="grid h-full grid-cols-1 bg-background md:grid-cols-2">
      <div className="min-h-0 border-b border-border md:border-b-0 md:border-r">
        <SlidePanel
          slide={currentSlide}
          currentIndex={slideIndex}
          totalSlides={lesson.slides.length}
          onPrev={handlePrev}
          onNext={handleNext}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
          prevDisabled={false}
          nextDisabled={nextDisabled}
          nextPreviewTitle={isLastSlide && nextLesson ? nextLesson.title : undefined}
        />
      </div>
      <div className="grid min-h-0 grid-rows-2">
        <div className="flex min-h-0 flex-col border-b border-border">
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary/60" />
            {editorFileNameFor(courseLanguage)}
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor value={code} language={courseLanguage} onChange={setCode} />
          </div>
        </div>
        <div className="flex min-h-0 flex-col bg-card">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <EyeIcon className="h-3.5 w-3.5" />
              プレビュー
            </span>
            {currentSlide.type === "example" && (
              <span className="font-medium text-primary-text">完成イメージ</span>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <PreviewPane code={code} language={courseLanguage} ref={iframeRef} />
          </div>
          {currentSlide.type === "exercise" && (
            <div className="shrink-0 border-t border-border p-4">
              <ResultChecker
                onCheck={handleCheck}
                onReset={handleReset}
                result={result}
                hint={currentSlide.hint}
                commonMistakes={currentSlide.commonMistakes}
                solutionCode={currentSlide.solutionCode}
                checkDisabled={isPython && !pyodideReady}
              />
            </div>
          )}
          {currentSlide.type === "example" && isPython && (
            <div className="shrink-0 border-t border-border p-4">
              <button
                type="button"
                onClick={handleRunPython}
                disabled={!pyodideReady}
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                <PlayIcon className="h-4 w-4" />
                実行してみる
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
