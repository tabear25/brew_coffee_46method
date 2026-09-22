import type {
  ControlValues,
  DerivedValue,
  PourPattern,
  Recipe,
  RecipeStep,
  StartCondition,
} from "./recipe.types";

export type BrewStatus =
  "idle" | "preview" | "running" | "paused" | "waiting_for_confirmation" | "completed";

/** 原法モード / アレンジモード */
export type RecipeMode = "original" | "arranged";

/** アレンジモードでの上書き。undefined のキーは原法値を使う */
export interface Arrangement {
  /** 豆1に対する湯量 */
  ratio?: number;
  temperatureC?: number;
  /** 挽き目の相対オフセット（+ で粗く） */
  grindOffset?: number;
}

export const EMPTY_ARRANGEMENT: Arrangement = {};

export type WarningLevel = "info" | "warning";

export interface RecipeWarning {
  id: string;
  level: WarningLevel;
  message: string;
}

export interface ComputedStep {
  step: RecipeStep;
  index: number;
  /** 時刻が確定しているステップの開始秒。状態条件のステップは null */
  startSec: number | null;
  /** 表示・進捗計算用の目安開始秒（状態条件でも必ず数値） */
  estimatedStartSec: number;
  /** 追加する湯量（g）。注湯を伴わないステップは 0 */
  deltaWaterG: number;
  /** このステップ完了時点の累計湯量（g） */
  cumulativeWaterG: number;
  /** 注湯・待機の所要秒。不明なら null */
  durationSec: number | null;
  /** 時間経過だけでは進行できず、ユーザー確認が必要 */
  requiresConfirmation: boolean;
  confirmLabel?: string;
  pattern?: PourPattern;
  startCondition: StartCondition;
  temperatureC: number;
}

export interface ComputedRecipe {
  recipe: Recipe;
  controls: ControlValues;
  mode: RecipeMode;
  arrangement: Arrangement;
  doseG: number;
  totalWaterG: number;
  /** 実効比率（湯量 / 豆量）。固定湯量型では豆量によって変化する */
  ratio: number;
  temperatureC: number;
  grindLevel: number;
  grindLabel: string;
  steps: ComputedStep[];
  /** 抽出終了の目安（秒） */
  estimatedFinishSec: number;
  /** 推定出来上がり量（g）。レシピの正式な湯量とは別物 */
  estimatedBeverageG: number;
  derived: DerivedValue[];
  warnings: RecipeWarning[];
  /** ユーザー操作によって原法から変更が加わっている */
  isArranged: boolean;
  /** 変更点の説明 */
  arrangedReasons: string[];
  /** 調査レポートに根拠がなくアプリ側で補完した箇所（ユーザー操作とは別） */
  supplementedNotes: string[];
}

export interface BrewSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
  /** 推定出来上がり量の計算に使う吸水係数（g/g） */
  absorptionFactor: number;
}

export const DEFAULT_SETTINGS: BrewSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  wakeLockEnabled: true,
  // 調査レポートの初期推定値。ユーザーが設定で変更できる
  absorptionFactor: 2.0,
};
