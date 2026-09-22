import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatDose, formatGrams, formatRatio } from "@/lib/format";
import type { ComputedRecipe } from "@/domain/brew.types";
import { Droplets } from "lucide-react";

const ABSOLUTE_MIN_G = 1;
const ABSOLUTE_MAX_G = 200;

/** スライダーの範囲は推奨粉量範囲から決める（範囲外も入力できるが警告を出す） */
function sliderBounds(computed: ComputedRecipe): { min: number; max: number } {
  const range = computed.recipe.reference.doseRangeG;
  if (!range) {
    const base = computed.recipe.reference.doseG;
    return { min: Math.max(ABSOLUTE_MIN_G, Math.round(base * 0.5)), max: Math.round(base * 2) };
  }
  return {
    min: Math.max(ABSOLUTE_MIN_G, range[0] - 5),
    max: Math.min(ABSOLUTE_MAX_G, range[1] + 10),
  };
}

export interface DoseControlProps {
  computed: ComputedRecipe;
  onChange: (doseG: number) => void;
}

export function DoseControl({ computed, onChange }: DoseControlProps) {
  const { min, max } = sliderBounds(computed);
  const doseG = computed.doseG;
  const isFixedWater = computed.recipe.scaling.water === "fixed_water";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">豆の量</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-4xl font-semibold tabular-nums tracking-[-0.02em]"
              data-testid="dose-display"
            >
              {formatDose(doseG)}
            </span>
            <span className="text-lg text-muted-foreground">g</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="dose-input" className="sr-only">
              豆の量（グラム）
            </Label>
            <Input
              id="dose-input"
              type="number"
              inputMode="decimal"
              step={0.1}
              min={ABSOLUTE_MIN_G}
              max={ABSOLUTE_MAX_G}
              value={doseG}
              onChange={(event) => {
                const parsed = Number.parseFloat(event.target.value);
                if (Number.isNaN(parsed)) return;
                const clamped = Math.min(ABSOLUTE_MAX_G, Math.max(ABSOLUTE_MIN_G, parsed));
                onChange(Number(clamped.toFixed(1)));
              }}
              className="h-11 w-20 text-center text-base font-medium tabular-nums"
              data-testid="input-dose"
            />
            <span aria-hidden className="text-sm text-muted-foreground">
              g
            </span>
          </div>
        </div>

        <Slider
          value={[Math.min(max, Math.max(min, doseG))]}
          onValueChange={([value]) => onChange(Number(value.toFixed(1)))}
          min={min}
          max={max}
          step={0.5}
          thumbLabel="豆の量"
          thumbValueText={`${formatDose(doseG)} グラム`}
          data-testid="slider-dose"
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5" aria-hidden />
            総湯量{" "}
            <span className="font-semibold text-foreground tabular-nums" data-testid="total-water">
              {formatGrams(computed.totalWaterG)}g
            </span>
          </span>
          <span className="text-xs" data-testid="ratio-display">
            比率 {formatRatio(computed.ratio)}
            {isFixedWater && <span className="ml-1">（湯量固定）</span>}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
