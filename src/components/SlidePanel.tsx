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
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-card p-6">
      <div>
        <p className="text-xs text-muted-foreground">
          {currentIndex + 1} / {totalSlides}
        </p>
        {slide.type === "explanation" ? (
          <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground">
            {slide.body}
          </p>
        ) : (
          <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground">
            {slide.instruction}
          </p>
        )}
      </div>
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-secondary"
        >
          ← 前へ
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={currentIndex === totalSlides - 1}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary"
        >
          次へ →
        </button>
      </div>
    </div>
  );
}
