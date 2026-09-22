import { describe, expect, it } from "vitest";
import { RECIPES } from "@/data/recipes";
import { validateRecipe, validateRecipes } from "@/domain/recipe-validator";

describe("レシピデータの検証", () => {
  it("すべてのレシピが検証を通る", () => {
    expect(validateRecipes(RECIPES)).toEqual([]);
  });

  it("調査レポート収録の 10 レシピとアプリ独自 3 メソッドを持つ", () => {
    expect(RECIPES.filter((r) => r.group === "researched")).toHaveLength(10);
    expect(RECIPES.filter((r) => r.group === "app")).toHaveLength(3);
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
