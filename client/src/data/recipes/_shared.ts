import type { RecipeStep } from "@/domain/recipe.types";

/**
 * すべてのレシピの最終ステップ。
 * 落ちきりの所要時間は豆・挽き目で変わるため時刻では固定せず、状態確認で終える。
 * 「抽出終了予定時刻」は ComputedRecipe.estimatedFinishSec として別に算出する。
 */
export function finishStep(order: number, instruction: string): RecipeStep {
  return {
    id: "finish",
    order,
    type: "finish",
    startCondition: { type: "water_level", value: "near_bed", label: "湯が落ちきった" },
    title: "抽出終了",
    instruction,
  };
}
