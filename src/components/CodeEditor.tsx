"use client";

import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";

type CodeEditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
};

export function CodeEditor({ value, language, onChange }: CodeEditorProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);

    function handleChange(event: MediaQueryListEvent) {
      setIsDark(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const languageExtension =
    language === "javascript"
      ? javascript()
      : language === "python"
        ? python()
        : language === "sql"
          ? sql()
          : html();

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={[languageExtension]}
      theme={isDark ? oneDark : "light"}
      height="100%"
      className="h-full text-sm"
    />
  );
}
