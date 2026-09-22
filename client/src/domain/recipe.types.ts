/**
 * レシピのデータモデル。
 *
 * 設計方針:
 *  - レシピ（データ）と計算ロジックを分離する。UI にレシピ固有の分岐を書かない。
 *  - 注湯量は「累計」で管理し、追加量は累計の差分として導出する（丸め誤差を積み上げない）。
 *  - 「時刻条件」と「状態条件」を startCondition で分離する。
 *  - レシピごとにスケーリング方法（scaling）を指定する。
 *
 * 出典の扱い:
 *  - 調査レポートに数値根拠があるものだけを原法値として保存する。
 *  - 根拠のない補完値には adaptation / isAppDefault を付け、UI と出典ダイアログで明示する。
 */

export type BrewerFamily = "cone" | "flat_bottom" | "chemex";

/** original = 作者本人の公開レシピ / official_partner = メーカー公式 / adaptation = 再現・翻案 */
export type SourceType = "original" | "official_partner" | "adaptation";

/** レシピの出自。researched = 調査レポート収録 / app = Brew Mate 独自 */
export type RecipeGroup = "researched" | "app";

export type StepType =
  "pour" | "wait" | "swirl" | "stir" | "manual_confirmation" | "remove_dripper" | "finish";

export type PourPattern =
  | "center"
  | "gentle_spiral"
  | "aggressive_spiral"
  | "center_to_outer"
  | "center_drip"
  | "coin_circle"
  | "expanding_circle"
  | "wide_fill";

export type AgitationType = "none" | "swirl" | "stir";
export type AgitationIntensity = "gentle" | "medium" | "strong";

export interface Agitation {
  type: AgitationType;
  intensity: AgitationIntensity;
  durationSec?: number;
}

/**
 * ステップの開始条件。
 *  - elapsed_time / after_previous … 時刻で自動進行できる
 *  - water_level / outflow_state / manual_confirm … ユーザーの確認が必要（自動進行しない）
 */
export type StartCondition =
  | { type: "elapsed_time"; valueSec: number }
  | { type: "after_previous"; delaySec?: number }
  | { type: "water_level"; value: "near_bed" | "partially_drained"; label: string }
  | { type: "outflow_state"; value: "slow_drip" | "seventy_percent_drained"; label: string }
  | { type: "manual_confirm"; label: string };

export type WaterTargetMode =
  "cumulative_fraction" | "delta_fraction" | "dose_multiple" | "fixed_reference_g";

export interface WaterTarget {
  mode: WaterTargetMode;
  value: number;
}

export interface RecipeStep {
  id: string;
  order: number;
  type: StepType;
  startCondition: StartCondition;
  waterTarget?: WaterTarget;
  /** g/秒。注湯時間 = 追加湯量 / flowRateGps で再計算する */
  flowRateGps?: number;
  /** 明示的な所要秒数。flowRateGps より優先する */
  durationSec?: number;
  pattern?: PourPattern;
  agitation?: Agitation;
  temperatureCOverride?: number;
  title: string;
  instruction: string;
  /** 状態条件のステップに表示する「目安の経過秒」。進行判定には使わない */
  estimateSec?: number;
  /** 調査レポートに根拠がなく、一般に流通するタイムライン等で補完した値 */
  adaptation?: boolean;
  /** adaptation の理由（出典ダイアログに表示） */
  adaptationNote?: string;
}

export interface GrindSpec {
  /** 1 = 極細 〜 10 = 極粗 の機種非依存な相対値 */
  level: number;
  label: string;
  /** 調査レポートに記載がなく、アプリ側で補ったことを示す */
  isAppDefault?: boolean;
}

export interface RecipeReference {
  doseG: number;
  waterG: number;
  /** 豆1に対する湯量。固定湯量型（scaling.water === "fixed_water"）では未定義 */
  ratio?: number;
  temperatureC: number;
  temperatureRangeC?: [number, number];
  grind: GrindSpec;
  targetFinishSec: number;
  targetFinishRangeSec?: [number, number];
  doseRangeG?: [number, number];
  /** doseRangeG がレポート由来ではなくアプリ既定値であることを示す */
  doseRangeIsAppDefault?: boolean;
  /** temperatureC がレポート由来ではなくアプリ既定値であることを示す */
  temperatureIsAppDefault?: boolean;
}

export interface RecipeScaling {
  water: "dose_ratio" | "fixed_water" | "custom";
  stepWater: "total_fraction" | "dose_multiple" | "fixed_reference";
  timing: "fixed_start_times" | "flow_rate" | "state_dependent";
  /** 湯量の丸め単位（g） */
  roundingG: number;
}

export interface RecipeControlOption {
  value: string;
  label: string;
  description: string;
  /** 調査レポートに数値根拠がない選択肢。選ぶと「原法から変更」扱いになる */
  adaptation?: boolean;
  /** この選択肢が総湯量比率を上書きする（例: アイスの濃さ） */
  ratioOverride?: number;
}

/**
 * レシピ固有の味・濃度コントロール。
 * 「すべてのレシピに同じ味調整ロジックを適用しない」ため、レシピ側が軸を宣言する。
 */
export interface FlavorControl {
  id: string;
  label: string;
  hint?: string;
  affects: "phase1_split" | "phase2_pours" | "ratio" | "milk_ratio" | "temperature";
  /** 選択式のコントロール */
  options?: RecipeControlOption[];
  /** 連続値のコントロール（カフェラテのミルク配分など） */
  range?: { min: number; max: number; step: number; unitLabel?: string };
  defaultValue: string;
}

export type ControlValues = Record<string, string>;

export interface DerivedValue {
  id: string;
  label: string;
  valueG: number;
  /** 推定値であることなどの注記 */
  note?: string;
  emphasis?: boolean;
}

export interface DeriveContext {
  doseG: number;
  totalWaterG: number;
  controls: ControlValues;
  roundingG: number;
}

export interface RecipeMetadata {
  sourceTitle: string;
  sourceUrl?: string;
  notes?: string;
  /** 同名レシピの別バージョンを区別するための補足（例: Rao 20/330 と 22/352） */
  versionNote?: string;
}

export interface RecipeConstraints {
  /** 推奨粉量範囲を外れたら警告する */
  scalingWarningOutsideDoseRange?: boolean;
  /** 状態確認ステップを含む */
  requiresStateConfirmation?: boolean;
  /** ドリッパー容量の上限チェックを促す */
  capacityCheck?: boolean;
}

export interface Recipe {
  id: string;
  version: string;
  name: string;
  shortName: string;
  author?: string;
  description: string;
  sourceType: SourceType;
  group: RecipeGroup;

  brewer: {
    family: BrewerFamily;
    models: string[];
    filter: "paper";
  };

  reference: RecipeReference;
  scaling: RecipeScaling;
  flavorControls?: FlavorControl[];

  /** 既定（基準設定）のステップ列。buildSteps を持つレシピでは既定値での出力と一致させる */
  steps: RecipeStep[];
  /**
   * 投数や配分がコントロールで変わるレシピ用のステップ生成関数。
   * 湯量は「割合」で表すため豆量に依存しない = 純粋関数。
   */
  buildSteps?: (controls: ControlValues) => RecipeStep[];
  /** ミルク量・氷量など、湯量以外の派生値 */
  derive?: (ctx: DeriveContext) => DerivedValue[];

  /**
   * 推定出来上がり量の出し方。
   *  - "absorption"（既定） … 総湯量 - 豆量 × 吸水係数
   *  - "none"              … 出来上がり量を derive 側で出すレシピ（アイス・カフェラテ）
   */
  beverageEstimate?: "absorption" | "none";

  constraints?: RecipeConstraints;
  metadata: RecipeMetadata;
}

/** コントロールの既定値をまとめて取り出す */
export function defaultControlValues(recipe: Recipe): ControlValues {
  const out: ControlValues = {};
  for (const control of recipe.flavorControls ?? []) {
    out[control.id] = control.defaultValue;
  }
  return out;
}

/** 欠けているキーを既定値で補ったコントロール値を返す */
export function withControlDefaults(recipe: Recipe, controls?: ControlValues): ControlValues {
  return { ...defaultControlValues(recipe), ...(controls ?? {}) };
}

/** 指定コントロールで実際に使うステップ列 */
export function resolveSteps(recipe: Recipe, controls: ControlValues): RecipeStep[] {
  return recipe.buildSteps ? recipe.buildSteps(controls) : recipe.steps;
}

/** 開始条件がユーザー確認を要するか（＝時間経過だけでは進行しない） */
export function isStateCondition(condition: StartCondition): boolean {
  return (
    condition.type === "water_level" ||
    condition.type === "outflow_state" ||
    condition.type === "manual_confirm"
  );
}

/** 状態条件の確認ボタンに出すラベル */
export function conditionLabel(condition: StartCondition): string | undefined {
  switch (condition.type) {
    case "water_level":
    case "outflow_state":
    case "manual_confirm":
      return condition.label;
    default:
      return undefined;
  }
}
