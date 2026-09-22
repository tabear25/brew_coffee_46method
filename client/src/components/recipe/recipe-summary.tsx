import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGrams, formatRatio, formatTime } from "@/lib/format";
import { grindScaleLabel } from "@/lib/labels";
import type { ComputedRecipe } from "@/domain/brew.types";

function Metric({
  label,
  value,
  unit,
  testId,
  emphasis,
}: {
  label: string;
  value: string;
  unit?: string;
  testId?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${emphasis ? "bg-primary/10" : "bg-muted/40"}`}>
      <div className="text-[11px] leading-tight text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 tabular-nums tracking-[-0.01em] ${emphasis ? "text-xl font-semibold" : "text-base font-semibold"}`}
        data-testid={testId}
      >
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export interface RecipeSummaryProps {
  computed: ComputedRecipe;
}

export function RecipeSummary({ computed }: RecipeSummaryProps) {
  const { recipe } = computed;
  const finishRange = recipe.reference.targetFinishRangeSec;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Metric
            label="総湯量"
            value={formatGrams(computed.totalWaterG)}
            unit="g"
            testId="summary-total-water"
            emphasis
          />
          <Metric
            label="豆と湯の比率"
            value={formatRatio(computed.ratio)}
            testId="summary-ratio"
            emphasis
          />
          <Metric
            label="推奨湯温"
            value={String(computed.temperatureC)}
            unit="℃"
            testId="summary-temperature"
          />
          <Metric label="推奨挽き目" value={computed.grindLabel} testId="summary-grind" />
          <Metric
            label="抽出時間の目安"
            value={
              finishRange
                ? `${formatTime(finishRange[0])}〜${formatTime(finishRange[1])}`
                : formatTime(computed.estimatedFinishSec)
            }
            testId="summary-finish"
          />
          {recipe.beverageEstimate !== "none" ? (
            <Metric
              label="推定出来上がり量"
              value={formatGrams(computed.estimatedBeverageG)}
              unit="g"
              testId="summary-beverage"
            />
          ) : (
            <Metric
              label="投数"
              value={String(computed.steps.filter((s) => s.step.type === "pour").length)}
              unit="投"
            />
          )}
        </div>

        {computed.derived.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {computed.derived.map((value) => (
              <Metric
                key={value.id}
                label={value.label}
                value={formatGrams(value.valueG)}
                unit="g"
                testId={`derived-${value.id}`}
                emphasis={value.emphasis}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          挽き目スケール {computed.grindLevel}/10（{grindScaleLabel(computed.grindLevel)}）。
          {recipe.beverageEstimate !== "none" && (
            <>
              「推定出来上がり量」は 総湯量 − 豆量 × 吸水係数
              による目安で、レシピの正式な湯量とは別物です。
            </>
          )}{" "}
          総抽出時間は成功条件ではなく診断値です。最終判断は味で行ってください。
        </p>

        {computed.isArranged && (
          <div
            className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5"
            data-testid="arranged-notice"
          >
            <Badge variant="outline" className="mb-1.5 px-1.5 py-0 text-[10px]">
              原法から変更されています
            </Badge>
            <ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
              {computed.arrangedReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {computed.supplementedNotes.length > 0 && (
          <div
            className="rounded-lg border border-border bg-muted/40 px-3 py-2.5"
            data-testid="supplemented-notice"
          >
            <Badge variant="outline" className="mb-1.5 px-1.5 py-0 text-[10px]">
              調査レポート外の補完を含みます
            </Badge>
            <ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
              {computed.supplementedNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
