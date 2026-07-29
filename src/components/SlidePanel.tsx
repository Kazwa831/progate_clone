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
    <div className="mt-6 rounded-lg border-l-2 border-highlight bg-surface-3 px-4 py-3">
      <p className="type-eyebrow flex items-center gap-1.5 text-highlight">
        <LightbulbIcon className="h-3.5 w-3.5" />
        ポイント
      </p>
      <ul className="type-body-sm mt-2 list-disc space-y-1.5 pl-4 text-ink-muted">
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
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-surface-1 px-7 py-6">
      <div>
        <p className="type-eyebrow text-ink-tertiary tabular-nums">
          {currentIndex + 1} / {totalSlides}
        </p>

        {slide.type === "explanation" && (
          <>
            {slide.heading && (
              <h2 className="type-headline mt-3 text-ink">{slide.heading}</h2>
            )}
            <p className="type-body mt-4 whitespace-pre-line text-ink-muted">
              <InlineText text={slide.body} />
            </p>
            {slide.points && slide.points.length > 0 && (
              <PointsCallout points={slide.points} />
            )}
          </>
        )}

        {slide.type === "example" && (
          <>
            <h2 className="type-headline mt-3 text-ink">
              {slide.heading ?? "完成イメージを見てみよう"}
            </h2>
            <p className="type-body mt-4 whitespace-pre-line text-ink-muted">
              <InlineText text={slide.description} />
            </p>
            {slide.points && slide.points.length > 0 && (
              <PointsCallout points={slide.points} />
            )}
          </>
        )}

        {slide.type === "exercise" && (
          <>
            <p className="type-body mt-4 whitespace-pre-line text-ink">
              <InlineText text={slide.instruction} />
            </p>
            {slide.points && slide.points.length > 0 && (
              <PointsCallout points={slide.points} />
            )}
          </>
        )}
      </div>

      {/*
        狭い画面では画面下部の操作バーが前へ/次へを担当するため、ここには出さない
        （同じ操作が2か所に出てしまうのを避ける）
      */}
      <div className="mt-8 hidden shrink-0 border-t border-hairline pt-4 md:block">
        {nextPreviewTitle && (
          <p className="type-caption mb-3 text-right text-ink-tertiary">
            次のレッスン: <span className="text-ink-subtle">{nextPreviewTitle}</span>
          </p>
        )}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={prevDisabled}
            className="interactive rounded-lg border border-hairline px-4 py-2.5 text-sm font-medium text-ink-subtle hover:border-hairline-strong hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {prevLabel}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="interactive rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
