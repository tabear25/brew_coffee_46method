import { describe, expect, it } from "vitest";
import { RECIPES, nagasakiJbrc2026 } from "@/data/recipes";
import type { Recipe } from "@/domain/recipe.types";
import { validateRecipe, validateRecipes } from "@/domain/recipe-validator";

describe("レシピデータの検証", () => {
  it("すべてのレシピが検証を通る", () => {
    expect(validateRecipes(RECIPES)).toEqual([]);
  });

  it("調査レポート収録の 10 レシピ、その他の公開レシピ 1 件、アプリ独自 3 メソッドを持つ", () => {
    expect(RECIPES.filter((r) => r.group === "researched")).toHaveLength(10);
    expect(RECIPES.filter((r) => r.group === "external")).toHaveLength(1);
    expect(RECIPES.filter((r) => r.group === "app")).toHaveLength(3);
  });

  it("総湯量で投数が変わるレシピは、推奨粉量範囲の端でも検証する", () => {
    // 総湯量を見ずに、常に 20g 用（240g・8 投）のステップを返す壊れたレシピ。
    // 基準の 17.5g（210g）では最後の追加量が 0g になるだけで通ってしまうが、
    // 推奨範囲の下端 15g（180g）では累計が総湯量を超え、最後の追加量が負になる。
    const frozen = nagasakiJbrc2026.buildSteps!({}, { doseG: 20, totalWaterG: 240 });
    const broken: Recipe = {
      ...nagasakiJbrc2026,
      id: "broken_fixed_pour",
      steps: frozen,
      buildSteps: () => frozen,
    };
    expect(validateRecipe(broken)).toEqual([
      expect.objectContaining({ code: "negative_delta", variant: "{} @ 15g" }),
    ]);
  });

  it.each(RECIPES.map((r) => [r.name, r] as const))("%s が単体で検証を通る", (_name, recipe) => {
    expect(validateRecipe(recipe)).toEqual([]);
  });

  it("id が重複していない", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("すべてのレシピが version と source metadata を持つ", () => {
    for (const recipe of RECIPES) {
      expect(recipe.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(recipe.metadata.sourceTitle.length).toBeGreaterThan(0);
    }
  });
});
