import { Slider } from "@/components/ui/slider";
import type { FlavorControl } from "@/domain/recipe.types";

export interface RangeControlProps {
  control: FlavorControl;
  value: string;
  onChange: (value: string) => void;
  /** スライダー左右の意味を示す補助表示 */
  renderValue?: (value: number) => React.ReactNode;
}

/** 連続値のコントロール（カフェラテのコーヒー:ミルク配分など） */
export function RangeControl({ control, value, onChange, renderValue }: RangeControlProps) {
  const range = control.range!;
  const parsed = Number.parseFloat(value);
  const current = Number.isNaN(parsed) ? range.min : parsed;
  const labelId = `${control.id}-label`;

  return (
    <div className="space-y-3">
      <div id={labelId} className="text-sm font-semibold">
        {control.label}
        {control.hint && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">{control.hint}</span>
        )}
      </div>
      <Slider
        value={[current]}
        min={range.min}
        max={range.max}
        step={range.step}
        onValueChange={([next]) => onChange(String(next))}
        thumbLabel={control.label}
        thumbValueText={`${current}${range.unitLabel ?? ""}`}
        data-testid={`range-${control.id}`}
      />
      {renderValue?.(current)}
    </div>
  );
}
