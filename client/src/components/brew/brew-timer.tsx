import { Droplets, Timer as TimerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ComputedRecipe, ComputedStep } from "@/domain/brew.types";
import { formatGrams, formatTime } from "@/lib/format";
import { PATTERN_LABELS, STEP_TYPE_LABELS } from "@/lib/labels";

export interface BrewTimerProps {
  computed: ComputedRecipe;
  currentStep: ComputedStep;
  nextStep: ComputedStep | null;
  elapsedSec: number;
  secondsToNext: number | null;
  isPaused: boolean;
  isCompleted: boolean;
}

export function BrewTimer({
  computed,
  currentStep,
  nextStep,
  elapsedSec,
  secondsToNext,
  isPaused,
  isCompleted,
}: BrewTimerProps) {
  const { step } = currentStep;
  const isPour = step.type === "pour";

  return (
    <section className="space-y-4" aria-label="抽出タイマー">
      {/* タイマーの数字は毎秒更新されるため、スクリーンリーダーへは通知しない */}
      <div className="text-center">
        <div
          className="text-6xl font-semibold tabular-nums tracking-[-0.03em]"
          data-testid="elapsed-time"
          aria-hidden
        >
          {formatTime(elapsedSec)}
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <TimerIcon className="h-3.5 w-3.5" aria-hidden />
          <span aria-hidden>経過時間</span>
          {isPaused && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]" data-testid="paused-badge">
              一時停止中
            </Badge>
          )}
          {isCompleted && (
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-[10px]"
              data-testid="completed-badge"
            >
              抽出完了
            </Badge>
          )}
        </div>
      </div>

      {/* ステップが変わったときだけ読み上げる */}
      <p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="step-announcer">
        {isCompleted
          ? "抽出が完了しました。"
          : `ステップ ${step.order}、${step.title}。${
              isPour
                ? `${formatGrams(currentStep.deltaWaterG)}グラム追加、目標累計 ${formatGrams(
                    currentStep.cumulativeWaterG,
                  )}グラム。`
                : ""
            }${step.instruction}`}
      </p>

      <div className="rounded-xl border border-primary bg-primary/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                ステップ {step.order} / {computed.steps.length}
              </span>
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {STEP_TYPE_LABELS[step.type]}
              </Badge>
            </div>
            <h2
              className="mt-0.5 text-lg font-semibold tracking-[-0.01em]"
              data-testid="current-step-title"
            >
              {step.title}
            </h2>
          </div>
          {secondsToNext !== null && (
            <div className="shrink-0 text-right">
              <div className="text-[10px] text-muted-foreground">次まで</div>
              <div className="text-xl font-semibold tabular-nums" data-testid="seconds-to-next">
                {Math.ceil(secondsToNext)}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">秒</span>
              </div>
            </div>
          )}
        </div>

        {isPour && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-background/60 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">今回追加する湯量</div>
              <div className="text-2xl font-semibold tabular-nums" data-testid="current-delta">
                +{formatGrams(currentStep.deltaWaterG)}
                <span className="ml-0.5 text-sm font-normal text-muted-foreground">g</span>
              </div>
            </div>
            <div className="rounded-lg bg-background/60 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">目標累計湯量</div>
              <div className="text-2xl font-semibold tabular-nums" data-testid="current-cumulative">
                {formatGrams(currentStep.cumulativeWaterG)}
                <span className="ml-0.5 text-sm font-normal text-muted-foreground">g</span>
              </div>
            </div>
          </div>
        )}

        <p className="mt-3 text-sm leading-relaxed">{step.instruction}</p>

        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {step.pattern && (
            <div className="flex gap-1.5">
              <dt>注ぎ方</dt>
              <dd className="font-medium text-foreground">{PATTERN_LABELS[step.pattern]}</dd>
            </div>
          )}
          {currentStep.durationSec !== null && (
            <div className="flex gap-1.5">
              <dt>注湯時間</dt>
              <dd className="font-medium tabular-nums text-foreground">
                {currentStep.durationSec}秒
              </dd>
            </div>
          )}
          <div className="flex gap-1.5">
            <dt>湯温</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {currentStep.temperatureC}℃
            </dd>
          </div>
        </dl>
      </div>

      {nextStep && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs">
          <Droplets className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">
            次は <span className="font-medium text-foreground">{nextStep.step.title}</span>
            {nextStep.deltaWaterG > 0 && (
              <>
                {" "}
                <span className="font-medium tabular-nums text-foreground">
                  +{formatGrams(nextStep.deltaWaterG)}g
                </span>
              </>
            )}
            {nextStep.startSec !== null ? (
              <>（{formatTime(nextStep.startSec)}）</>
            ) : (
              <>（状態を確認して進む）</>
            )}
          </span>
        </div>
      )}
    </section>
  );
}
