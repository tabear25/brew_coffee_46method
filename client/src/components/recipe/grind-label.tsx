import { Fragment } from "react";

/** 数字の範囲（例: 35〜40）。範囲の途中では改行しない */
const NUMBER_RANGE = /(\d+(?:\.\d+)?[〜～]\d+(?:\.\d+)?)/;

/**
 * 挽き目の表示。数字の範囲は 1 つの塊にして途中で改行せず、直後では改行できるようにする。
 * 例: 「中粗挽き〜粗め（コマンダンテ 35〜40クリック）」は 360px で「（コマンダンテ｜35〜40｜クリック）」。
 * 数字の範囲を含まないラベルは、そのままの文字列として表示される。
 */
export function GrindLabel({ text }: { text: string }) {
  return (
    <>
      {text.split(NUMBER_RANGE).map((part, i) =>
        i % 2 === 1 ? (
          <Fragment key={i}>
            <span className="whitespace-nowrap">{part}</span>
            <wbr />
          </Fragment>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
