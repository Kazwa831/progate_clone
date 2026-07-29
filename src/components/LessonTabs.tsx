"use client";

import { CodeIcon, EyeIcon, BookIcon } from "@/components/icons";

/** 狭い画面では3ペインを並べられないため、切り替えて1つずつ見せる */
export type LessonTab = "slide" | "code" | "result";

type LessonTabsProps = {
  value: LessonTab;
  onChange: (tab: LessonTab) => void;
  /** 演習スライドでは「結果」に判定が出るため、そこだけラベルを変える */
  resultLabel: string;
};

const ICON_CLASS = "h-4 w-4";

export function LessonTabs({ value, onChange, resultLabel }: LessonTabsProps) {
  const tabs: { id: LessonTab; label: string; icon: React.ReactNode }[] = [
    { id: "slide", label: "解説", icon: <BookIcon className={ICON_CLASS} /> },
    { id: "code", label: "コード", icon: <CodeIcon className={ICON_CLASS} /> },
    { id: "result", label: resultLabel, icon: <EyeIcon className={ICON_CLASS} /> },
  ];

  return (
    <div
      role="tablist"
      aria-label="学習画面の表示切り替え"
      className="flex shrink-0 border-b border-hairline bg-surface-1 md:hidden"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`interactive type-body-sm flex min-h-12 flex-1 items-center justify-center gap-1.5 border-b-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? "border-accent text-ink"
                : "border-transparent text-ink-tertiary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
