import type { Slide } from "@/types/lesson";
import { InlineText } from "@/components/InlineText";
import { LightbulbIcon } from "@/components/icons";

type SlidePanelProps = {
  slide: Slide;
  currentIndex: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  prevDisabled: boolean;
  nextDisabled: boolean;
  nextPreviewTitle?: string;
};

function PointsCallout({ points }: { points: string[] }) {
  return (
    <div className="mt-4 rounded-md bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-text">
        <LightbulbIcon className="h-3.5 w-3.5" />
        ポイント
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-foreground">
        {points.map((point, index) => (
          <li key={index}>
            <InlineText text={point} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SlidePanel({
  slide,
  currentIndex,
  totalSlides,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  prevDisabled,
  nextDisabled,
  nextPreviewTitle,
}: SlidePanelProps) {
  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-card p-6">
      <div>
        <p className="text-xs text-muted-foreground">
          {currentIndex + 1} / {totalSlides}
        </p>

        {slide.type === "explanation" && (
          <>
            {slide.heading && (
              <h2 className="mt-2 text-lg font-bold text-card-foreground">
                {slide.heading}
              </h2>
            )}
            <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground">
              <InlineText text={slide.body} />
            </p>
            {slide.points && slide.points.length > 0 && (
              <PointsCallout points={slide.points} />
            )}
          </>
        )}

        {slide.type === "example" && (
          <>
            <h2 className="mt-2 text-lg font-bold text-card-foreground">
              {slide.heading ?? "完成イメージを見てみよう"}
            </h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground">
              <InlineText text={slide.description} />
            </p>
            {slide.points && slide.points.length > 0 && (
              <PointsCallout points={slide.points} />
            )}
          </>
        )}

        {slide.type === "exercise" && (
          <>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground">
              <InlineText text={slide.instruction} />
            </p>
            {slide.points && slide.points.length > 0 && (
              <PointsCallout points={slide.points} />
            )}
          </>
        )}
      </div>

      <div className="mt-6 shrink-0">
        {nextPreviewTitle && (
          <p className="mb-2 text-right text-xs text-muted-foreground">
            次のレッスン: {nextPreviewTitle}
          </p>
        )}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={prevDisabled}
            className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-secondary"
          >
            {prevLabel}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
