import type { ComputedRecipe } from "@/domain/brew.types";
import { BrewStepCard } from "./brew-step-card";

export interface BrewStepListProps {
  computed: ComputedRecipe;
  /** タイマー画面で現在実行中のステップ番号（未指定ならプレビュー表示） */
  currentIndex?: number;
  compact?: boolean;
}

export function BrewStepList({ computed, currentIndex, compact }: BrewStepListProps) {
  return (
    <ol className="space-y-2" data-testid="brew-step-list">
      {computed.steps.map((step, index) => (
        <li key={step.step.id}>
          <BrewStepCard
            computed={step}
            active={currentIndex === index}
            done={currentIndex !== undefined && index < currentIndex}
            compact={compact}
          />
        </li>
      ))}
    </ol>
  );
}
