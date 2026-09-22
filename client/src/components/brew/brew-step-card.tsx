import { Badge } from "@/components/ui/badge";
import type { ComputedStep } from "@/domain/brew.types";
import { formatGrams, formatTime } from "@/lib/format";
import {
  AGITATION_INTENSITY_LABELS,
  PATTERN_LABELS,
  STEP_TYPE_LABELS,
  flowStrengthLabel,
  startConditionLabel,
} from "@/lib/labels";

export interface BrewStepCardProps {
  computed: ComputedStep;
  /** タイマー画面で現在実行中のステップ */
  active?: boolean;
  /** すでに終わったステップ */
  done?: boolean;
  compact?: boolean;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] leading-tight text-muted-foreground">{label}</dt>
      <dd className="text-xs font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function BrewStepCard({ computed, active, done, compact }: BrewStepCardProps) {
  const { step } = computed;
  const isPour = step.type === "pour";
  const flowLabel = flowStrengthLabel(step.flowRateGps);
  const timeLabel =
    computed.startSec !== null
      ? formatTime(computed.startSec)
      : `目安 ${formatTime(computed.estimatedStartSec)}`;

  return (
    <article
      data-testid={`step-card-${step.id}`}
      aria-current={active ? "step" : undefined}
      className={`rounded-xl border px-3 py-3 transition-colors ${
        active
          ? "border-primary bg-primary/10"
          : done
            ? "border-border bg-muted/20 opacity-70"
            : "border-border bg-card"
      }`}
    >
      <header className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
          aria-hidden
        >
          {step.order}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold">
              <span className="sr-only">ステップ {step.order}: </span>
              {step.title}
            </h3>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {STEP_TYPE_LABELS[step.type]}
            </Badge>
            {computed.requiresConfirmation && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                要確認
              </Badge>
            )}
            {step.adaptation && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                補完値
              </Badge>
            )}
          </div>

          {isPour && (
            <p className="mt-1 flex items-baseline gap-2">
              <span
                className="text-2xl font-semibold tabular-nums tracking-[-0.02em]"
                data-testid={`step-delta-${step.id}`}
              >
                +{formatGrams(computed.deltaWaterG)}
                <span className="ml-0.5 text-sm font-normal text-muted-foreground">g</span>
              </span>
              <span
                className="text-xs text-muted-foreground tabular-nums"
                data-testid={`step-cumulative-${step.id}`}
              >
                累計 {formatGrams(computed.cumulativeWaterG)}g
              </span>
            </p>
          )}

          {!compact && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {step.instruction}
            </p>
          )}
        </div>

        <span className="shrink-0 text-right">
          <span
            className="block text-sm font-semibold tabular-nums"
            data-testid={`step-time-${step.id}`}
          >
            {timeLabel}
          </span>
        </span>
      </header>

      {!compact && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/60 pt-2.5 sm:grid-cols-3">
          {step.pattern && <Field label="注ぎ方" value={PATTERN_LABELS[step.pattern]} />}
          {isPour && (
            <Field
              label="注湯時間"
              value={
                computed.durationSec !== null
                  ? `${computed.durationSec}秒${flowLabel ? `・${flowLabel}` : ""}`
                  : "レシピ指定なし"
              }
            />
          )}
          {step.type === "wait" && computed.durationSec !== null && (
            <Field label="待機時間" value={`約${computed.durationSec}秒`} />
          )}
          {step.agitation && step.agitation.type !== "none" && (
            <Field
              label="攪拌"
              value={`${AGITATION_INTENSITY_LABELS[step.agitation.intensity]}${
                step.agitation.type === "swirl" ? "スワール" : "撹拌"
              }`}
            />
          )}
          {step.agitation?.type === "none" && <Field label="攪拌" value="しない" />}
          <Field label="次へ進む条件" value={startConditionLabel(step.startCondition)} />
          {step.temperatureCOverride !== undefined && (
            <Field label="湯温" value={`${step.temperatureCOverride}℃`} />
          )}
        </dl>
      )}
    </article>
  );
}
