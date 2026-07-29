import type { CompletedLessonEntry } from "@/lib/statistics";
import { CheckIcon } from "@/components/icons";

type CompletedLessonListProps = {
  entries: CompletedLessonEntry[];
};

function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 新しい順に並んだ一覧を、その順序を保ったまま日付ごとにまとめる
function groupByDate(entries: CompletedLessonEntry[]) {
  const groups = new Map<string, CompletedLessonEntry[]>();
  for (const entry of entries) {
    const key = formatDate(entry.completedAt);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

export function CompletedLessonList({ entries }: CompletedLessonListProps) {
  if (entries.length === 0) {
    return (
      <p className="type-body-sm elevate-1 rounded-xl p-6 text-ink-subtle">
        まだ完了したレッスンはありません。コースを進めるとここに履歴が表示されます。
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groupByDate(entries).map(([date, lessons]) => (
        <div key={date}>
          <h3 className="type-eyebrow text-ink-tertiary">{date}</h3>
          <ul className="mt-3 divide-y divide-hairline border-t border-hairline">
            {lessons.map((lesson, index) => (
              <li
                key={`${date}-${index}`}
                className="interactive flex items-start gap-3 px-2 py-3.5 hover:bg-surface-3 sm:items-center"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-highlight text-accent-ink sm:mt-0">
                  <CheckIcon className="h-3 w-3" />
                </span>
                {/*
                  狭い画面では、コース名・章名を同じ行に置くとレッスン名が
                  切れてしまうため下の行に回す
                */}
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                  <span className="type-body-sm block truncate text-ink sm:min-w-0 sm:flex-1">
                    {lesson.lessonTitle}
                  </span>
                  <span className="type-caption mt-0.5 block truncate text-ink-tertiary sm:mt-0 sm:shrink-0">
                    {lesson.courseTitle} ・ {lesson.chapterTitle}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
