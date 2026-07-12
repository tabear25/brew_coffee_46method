// 4:6 Method Calculator
// Based on Tetsu Kasuya's method: World Brewers Cup 2016

export type FlavorBalance = "sweet" | "balanced" | "bright";
export type StrengthLevel = "light" | "medium" | "strong";
export type BrewMethod = "4:6" | "10:10" | "latte" | "flash";
// フラッシュブリュー（アイス）の濃さ。総量（お湯+氷）の比率を切り替える
export type FlashStrength = "rich" | "standard" | "light";

// 4:6 では flavor / strength、10:10 では bloom（蒸らし）/ pour（通常注湯）を使う
export type PourPhase = "flavor" | "strength" | "bloom" | "pour";

export interface PourStep {
  pourNumber: number;
  waterAmount: number; // grams
  cumulativeWater: number; // grams
  timeStart: string; // mm:ss
  purpose: string;
  phase: PourPhase;
}

export interface BrewRecipe {
  coffeeGrams: number;
  totalWater: number;
  ratio: string;
  method: BrewMethod;
  pourSteps: PourStep[];
  totalPours: number;
  estimatedBrewTime: string;
  // 4:6 メソッド固有（10:10 では未使用）
  flavorWater?: number; // 40%
  strengthWater?: number; // 60%
  flavorBalance?: FlavorBalance;
  strengthLevel?: StrengthLevel;
  // カフェラテ固有（他メソッドでは未使用）
  milkAmount?: number; // 必要ミルク量 g
  milkRatio?: number; // コーヒー1に対するミルクの倍率
  // フラッシュブリュー固有（他メソッドでは未使用）
  iceAmount?: number; // サーバーに先に入れる氷 g
  finishedVolume?: number; // 出来上がり総量（お湯 + 氷）g
  flashStrength?: FlashStrength;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 4:6 の前半40%（味）を1投目・2投目に分割する。方向性で1投目の比率を変える。
// 4:6 メソッドとフラッシュブリューで共通利用する。
function splitFlavorPours(
  flavorWater: number,
  flavorBalance: FlavorBalance
): [number, number] {
  let pour1: number;
  switch (flavorBalance) {
    case "sweet":
      // 1投目を少なく → 甘みが強調
      pour1 = Math.round(flavorWater * 0.4);
      break;
    case "bright":
      // 1投目を多く → 酸味・明るさが強調
      pour1 = Math.round(flavorWater * 0.6);
      break;
    case "balanced":
    default:
      pour1 = Math.round(flavorWater / 2);
      break;
  }
  return [pour1, flavorWater - pour1];
}

export function calculateRecipe(
  coffeeGrams: number,
  flavorBalance: FlavorBalance = "balanced",
  strengthLevel: StrengthLevel = "medium"
): BrewRecipe {
  // 1:15 ratio
  const totalWater = coffeeGrams * 15;
  const flavorWater = Math.round(totalWater * 0.4);
  const strengthWater = totalWater - flavorWater;

  // Flavor phase: 2 pours (40%)
  const [pour1, pour2] = splitFlavorPours(flavorWater, flavorBalance);

  // Strength phase: variable pours (60%)
  let strengthPourCount: number;
  switch (strengthLevel) {
    case "light":
      strengthPourCount = 2;
      break;
    case "strong":
      strengthPourCount = 4;
      break;
    case "medium":
    default:
      strengthPourCount = 3;
      break;
  }

  const strengthPourAmount = Math.round(strengthWater / strengthPourCount);
  const strengthRemainder = strengthWater - strengthPourAmount * (strengthPourCount - 1);

  // Build pour steps
  const pourSteps: PourStep[] = [];
  let cumulative = 0;
  const intervalSeconds = 45;

  // Pour 1 (flavor)
  cumulative += pour1;
  pourSteps.push({
    pourNumber: 1,
    waterAmount: pour1,
    cumulativeWater: cumulative,
    timeStart: formatTime(0),
    purpose: "蒸らし + 味の方向性",
    phase: "flavor",
  });

  // Pour 2 (flavor)
  cumulative += pour2;
  pourSteps.push({
    pourNumber: 2,
    waterAmount: pour2,
    cumulativeWater: cumulative,
    timeStart: formatTime(intervalSeconds),
    purpose: "味のバランス調整",
    phase: "flavor",
  });

  // Strength pours
  for (let i = 0; i < strengthPourCount; i++) {
    const amount = i === strengthPourCount - 1 ? strengthRemainder : strengthPourAmount;
    cumulative += amount;
    pourSteps.push({
      pourNumber: i + 3,
      waterAmount: amount,
      cumulativeWater: cumulative,
      timeStart: formatTime((i + 2) * intervalSeconds),
      purpose: i === 0 ? "濃度調整 開始" : "濃度調整",
      phase: "strength",
    });
  }

  const totalPours = 2 + strengthPourCount;
  const lastPourTime = (totalPours - 1) * intervalSeconds;
  const estimatedEnd = lastPourTime + 45; // last pour drains ~45s

  return {
    coffeeGrams,
    totalWater,
    ratio: "1:15",
    method: "4:6",
    flavorWater,
    strengthWater,
    pourSteps,
    totalPours,
    estimatedBrewTime: formatTime(estimatedEnd),
    flavorBalance,
    strengthLevel,
  };
}

// 10:10 メソッド（粕谷哲）
// ルール:
//   1. 目標とする総湯量を 10 等分し、蒸らしを含め全 10 投を均等量で注ぐ
//   2. 1 投目（蒸らし）のみ 45 秒、2 投目以降は 30 秒間隔
//   3. 総湯量は 4:6 と同じ 1:15 比率で算出（例: 20g → 300g → 30g × 10 投）
// タイム: 0:00 / 0:45 / 1:15 / 1:45 / 2:15 / 2:45 / 3:15 / 3:45 / 4:15 / 4:45
export function calculateRecipe1010(coffeeGrams: number): BrewRecipe {
  const totalWater = coffeeGrams * 15;
  const pourCount = 10;
  const basePour = Math.round(totalWater / pourCount);

  const bloomSeconds = 45; // 1 投目（蒸らし）の保持時間
  const intervalSeconds = 30; // 2 投目以降の間隔

  const pourSteps: PourStep[] = [];
  let cumulative = 0;

  for (let i = 0; i < pourCount; i++) {
    // 端数は最終投で吸収し、累計が総湯量と一致するようにする
    const amount = i === pourCount - 1 ? totalWater - cumulative : basePour;
    cumulative += amount;
    // 1 投目: 0 秒 / 2 投目以降: 45 秒 + (順番 - 2) × 30 秒
    const timeSeconds = i === 0 ? 0 : bloomSeconds + (i - 1) * intervalSeconds;
    pourSteps.push({
      pourNumber: i + 1,
      waterAmount: amount,
      cumulativeWater: cumulative,
      timeStart: formatTime(timeSeconds),
      purpose: i === 0 ? "蒸らし" : `${i + 1}投目`,
      phase: i === 0 ? "bloom" : "pour",
    });
  }

  return {
    coffeeGrams,
    totalWater,
    ratio: "1:15",
    method: "10:10",
    pourSteps,
    totalPours: pourCount,
    // 10:10 は投数・間隔が固定のため、目標抽出時間も湯量によらず一定
    estimatedBrewTime: "3:30〜4:30",
  };
}

// カフェラテ用抽出
// ルール:
//   1. 豆量 = 抽出したい湯量の 1/10（豆:湯 = 1:10）
//   2. 湯量を 5 等分し、5 回に分けて注ぐ（端数は最終投で吸収）
//   3. 1 投目（蒸らし）のみ 45 秒保持、2 投目以降も 45 秒間隔
//   4. コーヒー湯量 × ミルク比 で必要ミルク量を算出
export function calculateLatteRecipe(
  coffeeWater: number,
  milkRatio: number = 2
): BrewRecipe {
  const totalWater = coffeeWater;
  // 豆量 = 湯量 / 10（0.1g 精度）
  const coffeeGrams = Math.round((coffeeWater / 10) * 10) / 10;

  const pourCount = 5;
  const basePour = Math.round(totalWater / pourCount);
  const bloomSeconds = 45; // 1 投目（蒸らし）の保持時間
  const intervalSeconds = 45; // 2 投目以降の間隔

  const pourSteps: PourStep[] = [];
  let cumulative = 0;

  for (let i = 0; i < pourCount; i++) {
    // 端数は最終投で吸収し、累計が総湯量と一致するようにする
    const amount = i === pourCount - 1 ? totalWater - cumulative : basePour;
    cumulative += amount;
    // 1 投目: 0 秒 / 2 投目以降: 45 秒 + (順番 - 2) × 45 秒
    const timeSeconds = i === 0 ? 0 : bloomSeconds + (i - 1) * intervalSeconds;
    pourSteps.push({
      pourNumber: i + 1,
      waterAmount: amount,
      cumulativeWater: cumulative,
      timeStart: formatTime(timeSeconds),
      purpose: i === 0 ? "蒸らし" : `${i + 1}投目`,
      phase: i === 0 ? "bloom" : "pour",
    });
  }

  const milkAmount = Math.round(totalWater * milkRatio);
  const lastPourTime = bloomSeconds + (pourCount - 2) * intervalSeconds;

  return {
    coffeeGrams,
    totalWater,
    ratio: "1:10",
    method: "latte",
    pourSteps,
    totalPours: pourCount,
    estimatedBrewTime: formatTime(lastPourTime + 45),
    milkAmount,
    milkRatio,
  };
}

// フラッシュブリュー（日本式アイスコーヒー / 急冷式）
// 考え方:
//   1. 出来上がり総量（お湯 + 氷）を 豆量 × 総比率 で決める（濃さプリセットで 13〜16）
//   2. そのうち 40% を「氷」としてサーバーに先入れ、残り 60% を「お湯」として注ぐ
//      → お湯:氷 ≒ 1.5:1（ユーザー指定の 豆:お湯:氷 = 1:10:6〜7 と整合）
//   3. お湯は 4:6 構造で分割（前半40%=味 / 後半60%=濃度、45秒間隔）し、氷めがけて落として急冷する
//   例: 豆20g・標準(1:15) → 総量300g / 氷120g / お湯180g（豆:お湯:氷 = 1:9:6 ＝ 粕谷式アイス4:6）
const FLASH_TOTAL_RATIO: Record<FlashStrength, number> = {
  rich: 13, // しっかり濃いめ（例: 1:8:5）
  standard: 15, // 標準（粕谷式アイス4:6 ＝ 1:9:6）
  light: 16, // ライト（例: 1:10:6.5）
};
const FLASH_ICE_FRACTION = 0.4; // 出来上がり総量に対する氷の割合

export function calculateFlashRecipe(
  coffeeGrams: number,
  flavorBalance: FlavorBalance = "balanced",
  flashStrength: FlashStrength = "standard"
): BrewRecipe {
  const totalRatio = FLASH_TOTAL_RATIO[flashStrength];
  const finishedVolume = Math.round(coffeeGrams * totalRatio); // 出来上がり総量（お湯 + 氷）
  const iceAmount = Math.round(finishedVolume * FLASH_ICE_FRACTION); // 先に入れる氷
  const hotWater = finishedVolume - iceAmount; // 実際に注ぐお湯（注湯合計と一致）

  // お湯を 4:6 構造で分割（前半40%=味 / 後半60%=濃度）
  const flavorWater = Math.round(hotWater * 0.4);
  const strengthWater = hotWater - flavorWater;
  const [pour1, pour2] = splitFlavorPours(flavorWater, flavorBalance);

  const strengthPourCount = 3; // 後半（濃度）は3投固定
  const strengthPourAmount = Math.round(strengthWater / strengthPourCount);
  const strengthRemainder = strengthWater - strengthPourAmount * (strengthPourCount - 1);

  const pourSteps: PourStep[] = [];
  let cumulative = 0;
  const intervalSeconds = 45;

  // Pour 1 / 2（味）
  cumulative += pour1;
  pourSteps.push({
    pourNumber: 1,
    waterAmount: pour1,
    cumulativeWater: cumulative,
    timeStart: formatTime(0),
    purpose: "蒸らし + 味の方向性",
    phase: "flavor",
  });
  cumulative += pour2;
  pourSteps.push({
    pourNumber: 2,
    waterAmount: pour2,
    cumulativeWater: cumulative,
    timeStart: formatTime(intervalSeconds),
    purpose: "味のバランス調整",
    phase: "flavor",
  });

  // 濃度パート（氷めがけて注ぐ）
  for (let i = 0; i < strengthPourCount; i++) {
    const amount = i === strengthPourCount - 1 ? strengthRemainder : strengthPourAmount;
    cumulative += amount;
    pourSteps.push({
      pourNumber: i + 3,
      waterAmount: amount,
      cumulativeWater: cumulative,
      timeStart: formatTime((i + 2) * intervalSeconds),
      purpose: i === 0 ? "濃度調整 開始（氷に落とす）" : "濃度調整",
      phase: "strength",
    });
  }

  const totalPours = 2 + strengthPourCount;
  const lastPourTime = (totalPours - 1) * intervalSeconds;

  // 豆:お湯:氷 の実比率（0.1精度）
  const hotRatio = Math.round((hotWater / coffeeGrams) * 10) / 10;
  const iceRatio = Math.round((iceAmount / coffeeGrams) * 10) / 10;

  return {
    coffeeGrams,
    totalWater: hotWater, // 注ぐお湯（pourSteps の合計と一致）
    ratio: `1:${hotRatio}:${iceRatio}`, // 豆:お湯:氷
    method: "flash",
    pourSteps,
    totalPours,
    estimatedBrewTime: formatTime(lastPourTime + 45),
    flavorBalance,
    iceAmount,
    finishedVolume,
    flashStrength,
  };
}

export const BREW_METHODS = [
  {
    value: "4:6" as const,
    label: "4:6 メソッド",
    description: "前半40%(味)/後半60%(濃度)。味と濃度を調整",
  },
  {
    value: "10:10" as const,
    label: "10:10 メソッド",
    description: "湯量を10等分。蒸らし45秒＋以降30秒間隔で10投",
  },
  {
    value: "latte" as const,
    label: "カフェラテ",
    description: "湯量の1/10の豆で5投。ミルク量も計算",
  },
  {
    value: "flash" as const,
    label: "アイス（フラッシュブリュー）",
    description: "氷に熱湯を落として急冷。濃いめ設計のアイスコーヒー",
  },
];

export const ROAST_LEVELS = [
  { value: "light", label: "浅煎り", emoji: "🫘" },
  { value: "medium-light", label: "中浅煎り", emoji: "🫘" },
  { value: "medium", label: "中煎り", emoji: "☕" },
  { value: "medium-dark", label: "中深煎り", emoji: "☕" },
  { value: "dark", label: "深煎り", emoji: "🖤" },
] as const;

export const FLAVOR_BALANCES = [
  { value: "sweet" as const, label: "甘め", description: "1投目を少なく → 甘みが強調" },
  { value: "balanced" as const, label: "バランス", description: "均等配分 → 酸味と甘みのバランス" },
  { value: "bright" as const, label: "明るめ", description: "1投目を多く → 酸味・明るさを強調" },
];

export const STRENGTH_LEVELS = [
  { value: "light" as const, label: "軽め", description: "後半2回 → さっぱりした味わい" },
  { value: "medium" as const, label: "標準", description: "後半3回 → バランスの取れた濃度" },
  { value: "strong" as const, label: "濃いめ", description: "後半4回 → しっかりした濃度" },
];

// フラッシュブリューの濃さ（総量＝お湯+氷の比率）。氷は総量の40%で一定。
export const FLASH_STRENGTHS = [
  { value: "rich" as const, label: "しっかり濃いめ", description: "豆:湯:氷 ≒ 1:8:5（総量 1:13）" },
  { value: "standard" as const, label: "標準", description: "豆:湯:氷 ≒ 1:9:6（総量 1:15・粕谷式）" },
  { value: "light" as const, label: "ライト", description: "豆:湯:氷 ≒ 1:10:6.5（総量 1:16）" },
];
