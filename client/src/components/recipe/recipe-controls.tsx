import { Card, CardContent } from "@/components/ui/card";
import type { ComputedRecipe } from "@/domain/brew.types";
import { FlavorControl } from "./flavor-control";
import { RangeControl } from "./range-control";
import { StrengthControl } from "./strength-control";

export interface RecipeControlsProps {
  computed: ComputedRecipe;
  onChange: (controlId: string, value: string) => void;
}

/**
 * レシピが宣言したコントロールを、種類に応じたコンポーネントへ振り分ける。
 * 「すべてのレシピに同じ味調整ロジックを適用しない」ため、UI 側は軸を決め打ちしない。
 */
export function RecipeControls({ computed, onChange }: RecipeControlsProps) {
  const controls = computed.recipe.flavorControls ?? [];
  if (controls.length === 0) return null;

  return (
    <div className="space-y-4">
      {controls.map((control) => {
        const value = computed.controls[control.id] ?? control.defaultValue;

        if (control.range) {
          const totalParts = control.range.max;
          return (
            <Card key={control.id}>
              <CardContent className="p-4">
                <RangeControl
                  control={control}
                  value={value}
                  onChange={(next) => onChange(control.id, next)}
                  renderValue={(coffeeParts) => (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        コーヒー{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {coffeeParts}
                        </span>
                      </span>
                      <span>
                        ミルク{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {totalParts - coffeeParts}
                        </span>
                      </span>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          );
        }

        const Control = control.affects === "phase1_split" ? FlavorControl : StrengthControl;
        return (
          <Card key={control.id}>
            <CardContent className="p-4">
              <Control
                control={control}
                value={value}
                onChange={(next) => onChange(control.id, next)}
                testIdPrefix={`control-${control.id}`}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
