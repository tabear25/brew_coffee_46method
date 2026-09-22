import { HandMetal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComputedStep } from "@/domain/brew.types";
import { formatGrams, formatTime } from "@/lib/format";

export interface ManualConditionPromptProps {
  nextStep: ComputedStep;
  label: string;
  onConfirm: () => void;
}

/**
 * 排水状態や水位が条件のステップは自動で進めず、ユーザーの確認を待つ。
 */
export function ManualConditionPrompt({ nextStep, label, onConfirm }: ManualConditionPromptProps) {
  return (
    <section
      className="rounded-xl border border-primary bg-primary/10 p-4"
      aria-labelledby="manual-condition-title"
      data-testid="manual-condition-prompt"
    >
      <h2 id="manual-condition-title" className="flex items-center gap-2 text-sm font-semibold">
        <HandMetal className="h-4 w-4" aria-hidden />
        状態を確認してください
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        このステップは時間ではなく抽出の状態で進みます。次は「{nextStep.step.title}」
        {nextStep.deltaWaterG > 0 && (
          <>
            （+{formatGrams(nextStep.deltaWaterG)}g ／ 累計 {formatGrams(nextStep.cumulativeWaterG)}
            g）
          </>
        )}
        。目安は {formatTime(nextStep.estimatedStartSec)} 前後です。
      </p>
      <Button
        className="mt-3 min-h-[52px] w-full text-base"
        onClick={onConfirm}
        data-testid="confirm-condition"
      >
        {label}
      </Button>
    </section>
  );
}
