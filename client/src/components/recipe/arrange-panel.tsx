import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { Arrangement, ComputedRecipe, RecipeMode } from "@/domain/brew.types";
import { grindScaleLabel } from "@/lib/labels";

export interface ArrangePanelProps {
  computed: ComputedRecipe;
  mode: RecipeMode;
  arrangement: Arrangement;
  onModeChange: (mode: RecipeMode) => void;
  onArrange: (patch: Arrangement) => void;
  onReset: () => void;
}

const MODES: { value: RecipeMode; label: string; description: string }[] = [
  {
    value: "original",
    label: "原法モード",
    description: "作者の比率・温度・投数・配分を維持し、豆量だけを変える",
  },
  {
    value: "arranged",
    label: "アレンジモード",
    description: "比率・湯温・挽き目を上書きする（原法からの派生になる）",
  },
];

export function ArrangePanel({
  computed,
  mode,
  arrangement,
  onModeChange,
  onArrange,
  onReset,
}: ArrangePanelProps) {
  const { reference, scaling } = computed.recipe;
  const isFixedWater = scaling.water === "fixed_water";
  const ratioValue = arrangement.ratio ?? reference.ratio ?? Number(computed.ratio.toFixed(1));

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">調整モード</legend>
          <div role="radiogroup" aria-label="調整モード" className="grid grid-cols-2 gap-2">
            {MODES.map((option) => {
              const selected = option.value === mode;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onModeChange(option.value)}
                  data-testid={`mode-${option.value}`}
                  className={`pressable min-h-[44px] rounded-lg border px-3 py-2 text-left ${
                    selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {selected ? "● " : "○ "}
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {mode === "arranged" && (
          <div className="space-y-4 border-t border-border pt-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="arrange-ratio" className="text-sm font-medium">
                  比率（豆 1 : 湯）
                </Label>
                <span className="text-sm tabular-nums">1:{ratioValue.toFixed(1)}</span>
              </div>
              {isFixedWater && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  このレシピは本来 湯量 {reference.waterG}g
                  固定です。比率を指定すると比例計算に切り替わり、原法の派生版になります。
                </p>
              )}
              <Slider
                id="arrange-ratio"
                className="mt-2"
                value={[ratioValue]}
                min={8}
                max={20}
                step={0.5}
                onValueChange={([value]) => onArrange({ ratio: value })}
                thumbLabel="比率"
                thumbValueText={`1対${ratioValue.toFixed(1)}`}
                data-testid="arrange-ratio"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="arrange-temp" className="text-sm font-medium">
                湯温
              </Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="arrange-temp"
                  type="number"
                  inputMode="numeric"
                  min={60}
                  max={100}
                  step={1}
                  value={arrangement.temperatureC ?? reference.temperatureC}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(parsed)) return;
                    onArrange({ temperatureC: Math.min(100, Math.max(60, parsed)) });
                  }}
                  className="h-11 w-20 text-center tabular-nums"
                  data-testid="arrange-temperature"
                />
                <span aria-hidden className="text-sm text-muted-foreground">
                  ℃
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="arrange-grind" className="text-sm font-medium">
                  挽き目
                </Label>
                <span className="text-sm tabular-nums">
                  {computed.grindLevel}/10（{grindScaleLabel(computed.grindLevel)}）
                </span>
              </div>
              <Slider
                id="arrange-grind"
                className="mt-2"
                value={[computed.grindLevel]}
                min={1}
                max={10}
                step={1}
                onValueChange={([value]) =>
                  onArrange({ grindOffset: value - reference.grind.level })
                }
                thumbLabel="挽き目"
                thumbValueText={`${computed.grindLevel} / 10`}
                data-testid="arrange-grind"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                比率は主に「濃さ」、挽き目・湯温・時間は主に「抽出度」を変えます。
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] w-full"
              onClick={onReset}
              data-testid="reset-arrangement"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              原法の値に戻す
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
