import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TimerControlsProps {
  isPaused: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  onPause: () => void;
  onResume: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;
  onFinish: () => void;
}

export function TimerControls({
  isPaused,
  canGoBack,
  canGoNext,
  onPause,
  onResume,
  onNext,
  onPrevious,
  onReset,
  onFinish,
}: TimerControlsProps) {
  return (
    <div className="space-y-2" data-testid="timer-controls">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        <Button
          variant="outline"
          className="min-h-[52px]"
          onClick={onPrevious}
          disabled={!canGoBack}
          data-testid="control-previous"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          前へ
        </Button>
        <Button
          className="min-h-[52px] min-w-[112px] text-base"
          onClick={isPaused ? onResume : onPause}
          data-testid={isPaused ? "control-resume" : "control-pause"}
        >
          {isPaused ? (
            <>
              <Play className="h-4 w-4" aria-hidden />
              再開
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" aria-hidden />
              一時停止
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="min-h-[52px]"
          onClick={onNext}
          disabled={!canGoNext}
          data-testid="control-next"
        >
          次へ
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          className="min-h-[44px]"
          onClick={onReset}
          data-testid="control-reset"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          リセット
        </Button>
        <Button
          variant="secondary"
          className="min-h-[44px]"
          onClick={onFinish}
          data-testid="control-finish"
        >
          <Square className="h-4 w-4" aria-hidden />
          抽出終了
        </Button>
      </div>
    </div>
  );
}
