import type { Recipe, RecipeGroup } from "@/domain/recipe.types";
import { assertRecipesValid } from "@/domain/recipe-validator";

import { kasuya46 } from "./kasuya-46";
import { hoffmannBetterOneCup } from "./hoffmann-better-one-cup";
import { scottRaoV60 } from "./scott-rao-v60";
import { mattWintonFivePour } from "./matt-winton-five-pour";
import { lanceHedrick121 } from "./lance-hedrick-121";
import { aprilSixPulses } from "./april-six-pulses";
import { cafecOsmoticFlow } from "./cafec-osmotic-flow";
import { georgeHowellKalita } from "./george-howell-kalita";
import { konoPointDrip } from "./kono-point-drip";
import { blueBottleChemex } from "./blue-bottle-chemex";
import { kasuya1010 } from "./kasuya-1010";
import { cafeLatte } from "./cafe-latte";
import { flashBrew } from "./flash-brew";

/** 調査レポート収録の 10 レシピ ＋ Brew Mate 独自 3 メソッド */
export const RECIPES: Recipe[] = [
  kasuya46,
  hoffmannBetterOneCup,
  scottRaoV60,
  mattWintonFivePour,
  lanceHedrick121,
  aprilSixPulses,
  cafecOsmoticFlow,
  georgeHowellKalita,
  konoPointDrip,
  blueBottleChemex,
  kasuya1010,
  cafeLatte,
  flashBrew,
];

export const DEFAULT_RECIPE_ID = kasuya46.id;

export const RECIPE_GROUP_LABELS: Record<RecipeGroup, string> = {
  researched: "調査レポート収録レシピ",
  app: "Brew Mate 独自メソッド",
};

const byId = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));

export function getRecipe(id: string): Recipe | undefined {
  return byId.get(id);
}

export function getRecipeOrDefault(id: string | undefined): Recipe {
  return (id ? byId.get(id) : undefined) ?? kasuya46;
}

export function recipesByGroup(): { group: RecipeGroup; label: string; recipes: Recipe[] }[] {
  const groups: RecipeGroup[] = ["researched", "app"];
  return groups.map((group) => ({
    group,
    label: RECIPE_GROUP_LABELS[group],
    recipes: RECIPES.filter((recipe) => recipe.group === group),
  }));
}

// 不正なレシピデータは黙って補正せず、開発時にエラーにする
if (import.meta.env?.DEV) {
  assertRecipesValid(RECIPES);
}

export {
  kasuya46,
  hoffmannBetterOneCup,
  scottRaoV60,
  mattWintonFivePour,
  lanceHedrick121,
  aprilSixPulses,
  cafecOsmoticFlow,
  georgeHowellKalita,
  konoPointDrip,
  blueBottleChemex,
  kasuya1010,
  cafeLatte,
  flashBrew,
};
