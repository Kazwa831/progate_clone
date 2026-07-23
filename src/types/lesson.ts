export type SlideExplanation = {
  type: "explanation";
  body: string;
};

export type SlideExercise = {
  type: "exercise";
  instruction: string;
  starterCode: string;
  solutionCode: string;
  checkType: "contains-tag" | "css-property" | "regex-match";
  checkRule: Record<string, unknown>;
  hint?: string;
};

export type Slide = SlideExplanation | SlideExercise;

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
