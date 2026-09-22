import { AlertTriangle, Check } from "lucide-react";
import type { FlavorControl as FlavorControlDef } from "@/domain/recipe.types";

export interface OptionControlProps {
  control: FlavorControlDef;
  value: string;
  onChange: (value: string) => void;
  testIdPrefix: string;
}

/**
 * 選択式のコントロール（味の方向性など）。
 * 調査レポートに数値根拠がない選択肢には「派生」バッジを付ける。
 */
export function OptionControl({ control, value, onChange, testIdPrefix }: OptionControlProps) {
  const groupLabelId = `${control.id}-label`;

  return (
    <fieldset className="space-y-2">
      <legend id={groupLabelId} className="mb-2 text-sm font-semibold">
        {control.label}
        {control.hint && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">{control.hint}</span>
        )}
      </legend>
      <div role="radiogroup" aria-labelledby={groupLabelId} className="space-y-2">
        {control.options?.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              data-testid={`${testIdPrefix}-${option.value}`}
              className={`pressable flex min-h-[44px] w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left ${
                selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="mt-0.5 w-4 shrink-0">
                {selected && <Check className="h-4 w-4 text-primary" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {option.label}
                  {option.adaptation && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[10px] font-normal text-muted-foreground">
                      <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
                      派生
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** 味の方向性（前半の湯量配分）専用のラッパー */
export function FlavorControl(props: OptionControlProps) {
  return <OptionControl {...props} />;
}
