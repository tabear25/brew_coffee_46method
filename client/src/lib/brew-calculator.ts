// 4:6 Method Calculator
// Based on Tetsu Kasuya's method: World Brewers Cup 2016

export type FlavorBalance = "sweet" | "balanced" | "bright";
export type StrengthLevel = "light" | "medium" | "strong";
export type BrewMethod = "4:6" | "10:10";

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
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  let pour1: number;
  let pour2: number;
  
  switch (flavorBalance) {
    case "sweet":
      // First pour smaller → sweeter
      pour1 = Math.round(flavorWater * 0.4);
      pour2 = flavorWater - pour1;
      break;
    case "bright":
      // First pour larger → brighter/acidic
      pour1 = Math.round(flavorWater * 0.6);
      pour2 = flavorWater - pour1;
      break;
    case "balanced":
    default:
      pour1 = Math.round(flavorWater / 2);
      pour2 = flavorWater - pour1;
      break;
  }

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
