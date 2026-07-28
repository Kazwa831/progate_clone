"use client";

import { useEffect, useRef } from "react";
import { toDateKey } from "@/lib/dateKey";

/** 計測した時間をまとめて送る間隔 */
const FLUSH_INTERVAL_MS = 60 * 1000;
/** これ以上操作がなければ、席を外したとみなして計測を止める */
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

function postStudyTime(
  body: { date: string; addedSeconds: number; solvedExercise?: boolean },
  useBeacon: boolean
) {
  const payload = JSON.stringify(body);
  if (useBeacon) {
    // 離脱時は通常のfetchが中断されうるため、送信が保証されるbeaconを使う
    navigator.sendBeacon(
      "/api/study-time",
      new Blob([payload], { type: "application/json" })
    );
    return;
  }
  fetch("/api/study-time", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  }).catch(() => {
    // ローカル学習ツールのため、記録に失敗しても学習は継続できるようにする
  });
}

/** 演習に正解したことを、その日の学習実績として記録する */
export function reportSolvedExercise() {
  postStudyTime(
    { date: toDateKey(new Date()), addedSeconds: 0, solvedExercise: true },
    false
  );
}

/**
 * 学習時間を計測する。
 *
 * タブが見えている間だけを積算するため、バックグラウンドに放置した時間は
 * 加算されない。タブを開いたまま離席した場合に備えて、最後の操作から
 * 一定時間が過ぎた分は計上しない。
 *
 * なお当初は「1区間の上限（30分）」も設ける想定だったが、上記の離席判定に
 * よって1回の送信で加算されうる時間は最大でもIDLE_TIMEOUT_MSに収まるため
 * （スリープからの復帰時も同様）、重ねて上限を設ける必要はないと判断した。
 */
export function useStudyTimeTracker() {
  // 現在計測中の区間の開始時刻。タブが見えていないときはnull
  const segmentStartRef = useRef<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    function countedSeconds(now: number): number {
      const segmentStart = segmentStartRef.current;
      if (segmentStart === null) return 0;
      // 最後の操作から一定時間を過ぎた分は、席を外していたとみなして数えない
      const idleDeadline = lastActivityRef.current + IDLE_TIMEOUT_MS;
      const countedMs = Math.min(now, idleDeadline) - segmentStart;
      return Math.max(0, Math.floor(countedMs / 1000));
    }

    function flush(useBeacon: boolean) {
      const now = Date.now();
      const seconds = countedSeconds(now);
      // 送信済みの分を二重に数えないよう、区間の開始を今に進める
      if (segmentStartRef.current !== null) segmentStartRef.current = now;
      if (seconds <= 0) return;
      postStudyTime(
        { date: toDateKey(new Date()), addedSeconds: seconds },
        useBeacon
      );
    }

    function markActivity() {
      lastActivityRef.current = Date.now();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flush(true);
        segmentStartRef.current = null;
        return;
      }
      // タブに戻ってきた時点から計測を再開する
      segmentStartRef.current = Date.now();
      lastActivityRef.current = Date.now();
    }

    function handlePageHide() {
      flush(true);
      segmentStartRef.current = null;
    }

    if (document.visibilityState === "visible") {
      segmentStartRef.current = Date.now();
    }

    const timer = setInterval(() => flush(false), FLUSH_INTERVAL_MS);
    document.addEventListener("keydown", markActivity, { passive: true });
    document.addEventListener("pointerdown", markActivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      flush(false);
      clearInterval(timer);
      document.removeEventListener("keydown", markActivity);
      document.removeEventListener("pointerdown", markActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);
}
