// 4:6 Method Calculator
// Based on Tetsu Kasuya's method: World Brewers Cup 2016

export type FlavorBalance = "sweet" | "balanced" | "bright";
export type StrengthLevel = "light" | "medium" | "strong";

export interface PourStep {
  pourNumber: number;
  waterAmount: number; // grams
  cumulativeWater: number; // grams
  timeStart: string; // mm:ss
  purpose: string;
  phase: "flavor" | "strength";
}

export interface BrewRecipe {
  coffeeGrams: number;
  totalWater: number;
  ratio: string;
  flavorWater: number; // 40%
  strengthWater: number; // 60%
  pourSteps: PourStep[];
  totalPours: number;
  estimatedBrewTime: string;
  flavorBalance: FlavorBalance;
  strengthLevel: StrengthLevel;
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
    flavorWater,
    strengthWater,
    pourSteps,
    totalPours,
    estimatedBrewTime: formatTime(estimatedEnd),
    flavorBalance,
    strengthLevel,
  };
}

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
