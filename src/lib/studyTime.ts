import { prisma } from "@/lib/prisma";
import { differenceInDays, fromDateKey, toDateKey } from "@/lib/dateKey";

/** バッジを出す連続学習日数の節目 */
export const STREAK_MILESTONES = [3, 7, 14, 30];

export type StudySummary = {
  /** 学習時間の合計（秒）。可視時間からの概算値 */
  totalStudySeconds: number;
  currentStreak: number;
  longestStreak: number;
  /** 達成済みの節目（STREAK_MILESTONESのうち最長記録が届いたもの） */
  achievedMilestones: number[];
};

type AddStudyTimeInput = {
  date: string;
  addedSeconds: number;
  solvedExercise?: boolean;
};

/**
 * 学習時間を加算する。
 *
 * userIdは呼び出し元がセッションから解決した値を渡すこと
 * （リクエストボディ由来の値を渡すと他人の記録を書き換えられてしまう）。
 */
export async function addStudyTime(
  userId: string,
  input: AddStudyTimeInput
): Promise<void> {
  const key = { userId_date: { userId, date: input.date } };

  const existing = await prisma.studyDay.findUnique({ where: key });

  await prisma.studyDay.upsert({
    where: key,
    create: {
      userId,
      date: input.date,
      studySeconds: input.addedSeconds,
      solvedExercise: input.solvedExercise ?? false,
    },
    update: {
      // 時間は「加算」する（上書きではない）
      studySeconds: (existing?.studySeconds ?? 0) + input.addedSeconds,
      // 一度その日に正解したら、以後の送信で false に戻さない
      solvedExercise: input.solvedExercise || existing?.solvedExercise || false,
    },
  });
}

/**
 * 連続学習日数を求める。
 *
 * 「その日学習した」とみなすのは1問でも正解した日。日付の並びだけを見て
 * 都度計算するので、判定条件を変えても過去のデータから計算し直せる。
 */
export function calculateStreaks(studiedDateKeys: string[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (studiedDateKeys.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const descending = [...studiedDateKeys].sort().reverse();

  // 今日まだ学習していなくても、昨日まで続いていれば連続は途切れていない
  const todayKey = toDateKey(new Date());
  const daysSinceLastStudy = differenceInDays(
    fromDateKey(todayKey),
    fromDateKey(descending[0])
  );

  let currentStreak = 0;
  if (daysSinceLastStudy <= 1) {
    currentStreak = 1;
    for (let i = 1; i < descending.length; i++) {
      const gap = differenceInDays(
        fromDateKey(descending[i - 1]),
        fromDateKey(descending[i])
      );
      if (gap !== 1) break;
      currentStreak++;
    }
  }

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < descending.length; i++) {
    const gap = differenceInDays(
      fromDateKey(descending[i - 1]),
      fromDateKey(descending[i])
    );
    run = gap === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  return { currentStreak, longestStreak };
}

export async function getStudySummary(userId: string): Promise<StudySummary> {
  const days = await prisma.studyDay.findMany({ where: { userId } });

  const totalStudySeconds = days.reduce((sum, day) => sum + day.studySeconds, 0);
  const studiedDateKeys = days
    .filter((day) => day.solvedExercise)
    .map((day) => day.date);

  const { currentStreak, longestStreak } = calculateStreaks(studiedDateKeys);

  return {
    totalStudySeconds,
    currentStreak,
    longestStreak,
    achievedMilestones: STREAK_MILESTONES.filter(
      (milestone) => longestStreak >= milestone
    ),
  };
}
