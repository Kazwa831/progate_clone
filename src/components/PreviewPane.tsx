import type { Ref } from "react";

type PreviewPaneProps = {
  code: string;
  ref?: Ref<HTMLIFrameElement>;
};

export function PreviewPane({ code, ref }: PreviewPaneProps) {
  return (
    <iframe
      ref={ref}
      title="実行結果プレビュー"
      srcDoc={code}
      sandbox="allow-same-origin"
      className="h-full w-full border-0 bg-white"
    />
  );
}
