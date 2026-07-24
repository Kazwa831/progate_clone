"use client";

import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";

type CodeEditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
};

export function CodeEditor({ value, language, onChange }: CodeEditorProps) {
  const extensions = language === "javascript" ? [javascript()] : [html()];

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      height="100%"
      className="h-full text-sm"
    />
  );
}
