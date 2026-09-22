import { formatTime, formatTimeSpoken } from "@/lib/format";

export interface ProgressIndicatorProps {
  /** 0〜1 */
  ratio: number;
  currentStepNumber: number;
  totalSteps: number;
  elapsedSec: number;
  estimatedFinishSec: number;
}

export function ProgressIndicator({
  ratio,
  currentStepNumber,
  totalSteps,
  elapsedSec,
  estimatedFinishSec,
}: ProgressIndicatorProps) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);

  return (
    <div className="space-y-1.5">
      <div
        role="progressbar"
        aria-label="抽出全体の進捗"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}パーセント、ステップ ${currentStepNumber} / ${totalSteps}`}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        data-testid="progress-indicator"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>
          ステップ {currentStepNumber} / {totalSteps}
        </span>
        <span>抽出終了予定 {formatTime(estimatedFinishSec)}</span>
      </div>
      <span className="sr-only">経過 {formatTimeSpoken(elapsedSec)}</span>
    </div>
  );
}
