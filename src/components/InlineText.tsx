import { Fragment } from "react";

type InlineTextProps = {
  text: string;
};

// `<h1>` のようにバッククォートで囲まれた区間だけを、コード風のチップとして
// ハイライト表示する。教材のJSON側は素朴なテキストのまま書けるようにするため、
// Markdown全体をパースするのではなくこの記法だけをサポートする。
export function InlineText({ text }: InlineTextProps) {
  const parts = text.split(/(`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.length > 1 && part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.9em] text-primary-text"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}
