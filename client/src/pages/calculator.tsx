import { useState, useMemo } from "react";
import {
  calculateRecipe,
  FLAVOR_BALANCES,
  STRENGTH_LEVELS,
  type FlavorBalance,
  type StrengthLevel,
} from "@/lib/brew-calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Droplets, Timer, ArrowDown } from "lucide-react";

export default function CalculatorPage() {
  const [coffeeGrams, setCoffeeGrams] = useState(20);
  const [flavorBalance, setFlavorBalance] = useState<FlavorBalance>("balanced");
  const [strengthLevel, setStrengthLevel] = useState<StrengthLevel>("medium");

  const recipe = useMemo(
    () => calculateRecipe(coffeeGrams, flavorBalance, strengthLevel),
    [coffeeGrams, flavorBalance, strengthLevel]
  );

  return (
    <div className="space-y-6">
      {/* Coffee amount input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">豆の量</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Slider
                value={[coffeeGrams]}
                onValueChange={([v]) => setCoffeeGrams(v)}
                min={10}
                max={40}
                step={1}
                data-testid="slider-coffee-grams"
              />
            </div>
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <Input
                type="number"
                value={coffeeGrams}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 1 && v <= 60) setCoffeeGrams(v);
                }}
                className="w-16 h-8 text-center text-sm font-medium tabular-nums"
                data-testid="input-coffee-grams"
              />
              <span className="text-sm text-muted-foreground">g</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5" />
              <span>お湯 <span className="font-medium text-foreground tabular-nums">{recipe.totalWater}g</span></span>
            </div>
            <div className="text-xs">
              比率 {recipe.ratio}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flavor & Strength */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              味の方向性
              <span className="text-xs font-normal text-muted-foreground ml-2">前半40%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FLAVOR_BALANCES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFlavorBalance(opt.value)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  flavorBalance === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted/50"
                }`}
                data-testid={`flavor-${opt.value}`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              濃度
              <span className="text-xs font-normal text-muted-foreground ml-2">後半60%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {STRENGTH_LEVELS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStrengthLevel(opt.value)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  strengthLevel === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted/50"
                }`}
                data-testid={`strength-${opt.value}`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pour Steps */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">ドリップ手順</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="w-3.5 h-3.5" />
              <span>目安 {recipe.estimatedBrewTime}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {recipe.pourSteps.map((step, i) => (
              <div key={step.pourNumber} className="relative">
                {/* Connector line */}
                {i < recipe.pourSteps.length - 1 && (
                  <div className="absolute left-[19px] top-10 w-px h-[calc(100%-16px)] bg-border" />
                )}
                <div className="flex items-start gap-3 py-2.5">
                  {/* Step indicator */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      step.phase === "flavor"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.pourNumber}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {step.waterAmount}g
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {step.phase === "flavor" ? "味" : "濃度"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {step.timeStart}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {step.purpose}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">
                      累計 {step.cumulativeWater}g
                    </div>
                  </div>
                  {/* Pour arrow */}
                  <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/40 mt-1 shrink-0" />
                </div>
              </div>
            ))}
          </div>

          {/* Summary bar */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              合計 <span className="font-medium text-foreground">{recipe.totalPours}投</span>
              {" / "}
              <span className="font-medium text-foreground">{recipe.totalWater}g</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
