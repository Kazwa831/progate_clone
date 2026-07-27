import type { Lesson } from "@/types/lesson";

/**
 * そのスライドを開いたときに最初にエディタへ表示するコード。
 * 書きかけの下書きが無いときの初期値として、学習画面と、
 * 保存済みの下書きを復元するサーバー側の両方から使う。
 */
export function defaultCodeForSlide(lesson: Lesson, slideIndex: number): string {
  const slide = lesson.slides[slideIndex];
  if (slide.type === "exercise") return slide.starterCode;
  if (slide.type === "example") return slide.code;
  return "";
}
