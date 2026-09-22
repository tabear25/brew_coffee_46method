import { BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BREWER_FAMILY_LABELS, SOURCE_TYPE_LABELS, flowStrengthLabel } from "@/lib/labels";
import { formatTime } from "@/lib/format";
import type { ComputedRecipe } from "@/domain/brew.types";

/** レシピの出典・バージョン・補完箇所を開示する */
export function RecipeSourceDialog({ computed }: { computed: ComputedRecipe }) {
  const { recipe } = computed;
  const { reference, metadata } = recipe;
  const adaptedSteps = computed.steps.filter((s) => s.step.adaptation);
  const flowRates = Array.from(
    new Set(
      computed.steps
        .map((s) => s.step.flowRateGps)
        .filter((value): value is number => value !== undefined),
    ),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] w-full"
          data-testid="open-source-dialog"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          出典とレシピ詳細
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe.name}</DialogTitle>
          <DialogDescription>{recipe.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{SOURCE_TYPE_LABELS[recipe.sourceType]}</Badge>
            <Badge variant="outline">v{recipe.version}</Badge>
            <Badge variant="outline">{BREWER_FAMILY_LABELS[recipe.brewer.family]}</Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {recipe.id}
            </Badge>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">基準</dt>
            <dd className="tabular-nums">
              豆 {reference.doseG}g / 湯 {reference.waterG}g
              {reference.ratio !== undefined && ` / 1:${reference.ratio}`}
            </dd>
            <dt className="text-muted-foreground">湯温</dt>
            <dd className="tabular-nums">
              {reference.temperatureC}℃
              {reference.temperatureRangeC &&
                `（${reference.temperatureRangeC[0]}〜${reference.temperatureRangeC[1]}℃）`}
              {reference.temperatureIsAppDefault && "（アプリ既定値）"}
            </dd>
            <dt className="text-muted-foreground">挽き目</dt>
            <dd>
              {reference.grind.label}
              {reference.grind.isAppDefault && "（アプリ既定値）"}
            </dd>
            <dt className="text-muted-foreground">目標終了</dt>
            <dd className="tabular-nums">
              {reference.targetFinishRangeSec
                ? `${formatTime(reference.targetFinishRangeSec[0])}〜${formatTime(reference.targetFinishRangeSec[1])}`
                : formatTime(reference.targetFinishSec)}
            </dd>
            {reference.doseRangeG && (
              <>
                <dt className="text-muted-foreground">推奨粉量</dt>
                <dd className="tabular-nums">
                  {reference.doseRangeG[0]}〜{reference.doseRangeG[1]}g
                  {reference.doseRangeIsAppDefault && "（アプリ既定値）"}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">器具</dt>
            <dd>{recipe.brewer.models.join(" / ")}</dd>
            {flowRates.length > 0 && (
              <>
                <dt className="text-muted-foreground">基準流量</dt>
                <dd className="tabular-nums">
                  {flowRates.map((rate) => `${rate}g/秒（${flowStrengthLabel(rate)}）`).join(" / ")}
                </dd>
              </>
            )}
          </dl>

          <section>
            <h3 className="text-xs font-semibold">出典</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {metadata.sourceTitle}
              {metadata.versionNote && <> ／ {metadata.versionNote}</>}
            </p>
            {metadata.sourceUrl && (
              <a
                href={metadata.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs underline"
              >
                {metadata.sourceUrl}
              </a>
            )}
          </section>

          {metadata.notes && (
            <section>
              <h3 className="text-xs font-semibold">補足</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{metadata.notes}</p>
            </section>
          )}

          {adaptedSteps.length > 0 && (
            <section className="rounded-lg border border-primary/40 bg-primary/5 p-3">
              <h3 className="text-xs font-semibold">調査レポート外の補完</h3>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {adaptedSteps.map((step) => (
                  <li key={step.step.id}>
                    {step.step.title}: {step.step.adaptationNote}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
