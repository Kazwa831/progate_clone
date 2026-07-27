"use client";

import { useEffect, useRef } from "react";

/** 入力が止まってから保存するまでの待ち時間。打鍵のたびに送らないための間引き */
const DEBOUNCE_MS = 1000;

type DraftSnapshot = {
  courseId: string;
  lessonId: string;
  currentSlide: number;
  draftCode: string;
};

/**
 * 学習中のコードを自動保存する。
 *
 * 保存の契機は2種類ある。
 * 1. 入力が止まってから一定時間後（デバウンス）
 * 2. タブが非表示になった時・ページを離れる時
 *
 * 2だけでは、ブラウザが強制終了した場合など離脱イベントが発火しないケースで
 * 失われるため、1と併用している。離脱時は通常のfetchが中断される可能性が
 * あるため、送信の完了が保証される sendBeacon を使う。
 */
export function useDraftAutoSave(snapshot: DraftSnapshot) {
  // イベントハンドラからは常に最新の内容を読みたいが、リスナー自体は
  // 貼り直したくないため、値の受け渡しにrefを使う
  const latestRef = useRef(snapshot);
  useEffect(() => {
    latestRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { courseId, lessonId, currentSlide, draftCode } = latestRef.current;
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          lessonId,
          currentSlide,
          status: "in_progress",
          draftCode,
        }),
      }).catch(() => {
        // ローカル学習ツールのため、保存に失敗しても学習は継続できるようにする
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [snapshot]);

  useEffect(() => {
    function saveOnLeave() {
      const { courseId, lessonId, currentSlide, draftCode } = latestRef.current;
      const payload = JSON.stringify({
        courseId,
        lessonId,
        currentSlide,
        status: "in_progress",
        draftCode,
      });
      navigator.sendBeacon(
        "/api/progress",
        new Blob([payload], { type: "application/json" })
      );
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") saveOnLeave();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", saveOnLeave);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", saveOnLeave);
    };
  }, []);
}
