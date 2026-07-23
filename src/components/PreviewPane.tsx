type PreviewPaneProps = {
  code: string;
};

export function PreviewPane({ code }: PreviewPaneProps) {
  return (
    <iframe
      title="実行結果プレビュー"
      srcDoc={code}
      sandbox="allow-same-origin"
      className="h-full w-full border-0 bg-white"
    />
  );
}
