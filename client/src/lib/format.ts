/** 秒を m:ss 形式にする */
export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${(safe % 60).toString().padStart(2, "0")}`;
}

/** 秒を「1分30秒」のような読み上げ向け文字列にする */
export function formatTimeSpoken(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  if (minutes === 0) return `${rest}秒`;
  return rest === 0 ? `${minutes}分` : `${minutes}分${rest}秒`;
}

/** 湯量表示。整数なら小数点を出さない */
export function formatGrams(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** 豆量表示（0.1g 単位） */
export function formatDose(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** 比率表示 1:15.0 */
export function formatRatio(ratio: number): string {
  return `1:${ratio.toFixed(1)}`;
}
