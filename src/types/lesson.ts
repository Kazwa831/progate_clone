export type SlideExplanation = {
  type: "explanation";
  heading?: string;
  body: string;
  points?: string[];
};

// 「完成イメージ」を提示するスライド。コードをプレビューでレンダリングして見せる。
export type SlideExample = {
  type: "example";
  heading?: string;
  description: string;
  code: string;
  points?: string[];
};

export type SlideExercise = {
  type: "exercise";
  instruction: string;
  starterCode: string;
  solutionCode: string;
  checkType:
    | "contains-tag"
    | "css-property"
    | "regex-match"
    | "js-output-equals"
    | "python-output-equals"
    | "python-variable-equals";
  checkRule: Record<string, unknown>;
  hint?: string;
  commonMistakes?: string[];
  points?: string[];
};

export type Slide = SlideExplanation | SlideExample | SlideExercise;

export type Lesson = {
  id: string;
  title: string;
  slides: Slide[];
};

export type Chapter = {
  id: string;
  title: string;
  lessonIds: string[];
};

export type Course = {
  id: string;
  title: string;
  description: string;
  language: string;
  chapters: Chapter[];
};
