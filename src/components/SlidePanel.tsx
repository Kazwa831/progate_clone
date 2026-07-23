import type { Slide } from "@/types/lesson";

type SlidePanelProps = {
  slide: Slide;
  currentIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
};

export function SlidePanel({
  slide,
  currentIndex,
  totalSlides,
  onPrev,
  onNext,
}: SlidePanelProps) {
  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-6">
      <div>
        <p className="text-xs text-gray-400">
          {currentIndex + 1} / {totalSlides}
        </p>
        {slide.type === "explanation" ? (
          <p className="mt-4 whitespace-pre-line text-gray-800">
            {slide.body}
          </p>
        ) : (
          <>
            <p className="mt-4 whitespace-pre-line text-gray-800">
              {slide.instruction}
            </p>
            {slide.hint && (
              <p className="mt-4 text-sm text-gray-500">
                ヒント: {slide.hint}
              </p>
            )}
          </>
        )}
      </div>
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-40"
        >
          ← 前へ
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={currentIndex === totalSlides - 1}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}
