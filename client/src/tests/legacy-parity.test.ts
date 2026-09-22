import { describe, expect, it } from "vitest";
import { computeRecipe } from "@/domain/recipe-calculator";
import { cafeLatte, flashBrew, kasuya1010, kasuya46 } from "@/data/recipes";

/**
 * 旧 client/src/lib/brew-calculator.ts から移植した 3 メソッド（と 4:6）が、
 * 移植前と同じ総湯量・注湯時刻・派生値を返すことを固定する。
 *
 * 期待値は削除前の旧実装の出力そのもの。
 * 各投の 1g の端数配分だけは、仕様どおり「累計を丸めて差分を取る」方式に変えたため
 * 分布が変わる（合計は一致する）。
 */

function pours(computed: ReturnType<typeof computeRecipe>) {
  return computed.steps.filter((s) => s.step.type === "pour");
}

describe("旧実装からの移植パリティ", () => {
  it("4:6 バランス/標準は旧実装と完全に一致する", () => {
    const computed = computeRecipe({ recipe: kasuya46, doseG: 20 });
    expect(computed.totalWaterG).toBe(300);
    expect(pours(computed).map((s) => s.deltaWaterG)).toEqual([60, 60, 60, 60, 60]);
    expect(pours(computed).map((s) => s.startSec)).toEqual([0, 45, 90, 135, 180]);
  });

  it("4:6 の甘めは調査レポート準拠の 42:58（公式20g例 50g + 70g）になる", () => {
    const computed = computeRecipe({ recipe: kasuya46, doseG: 20, controls: { flavor: "sweet" } });
    const [first, second] = pours(computed).map((s) => s.deltaWaterG);
    expect([first, second]).toEqual([50, 70]);
  });

  it("4:6 の明るめは甘めの鏡像で、原法から変更された旨が立つ", () => {
    const computed = computeRecipe({ recipe: kasuya46, doseG: 20, controls: { flavor: "bright" } });
    expect(
      pours(computed)
        .map((s) => s.deltaWaterG)
        .slice(0, 2),
    ).toEqual([70, 50]);
    expect(computed.isArranged).toBe(true);
    expect(computed.arrangedReasons.join()).toContain("数値根拠なし");
  });

  it("10:10 は旧実装と同じ総湯量・注湯時刻になる", () => {
    for (const [doseG, total] of [
      [13, 195],
      [20, 300],
      [37, 555],
    ] as const) {
      const computed = computeRecipe({ recipe: kasuya1010, doseG });
      expect(computed.totalWaterG).toBe(total);
      expect(pours(computed)).toHaveLength(10);
      expect(
        pours(computed)
          .map((s) => s.deltaWaterG)
          .reduce((a, b) => a + b, 0),
      ).toBe(total);
    }
    expect(pours(computeRecipe({ recipe: kasuya1010, doseG: 20 })).map((s) => s.startSec)).toEqual([
      0, 45, 75, 105, 135, 165, 195, 225, 255, 285,
    ]);
  });

  it("カフェラテのミルク量・できあがり量が旧実装と一致する", () => {
    // 旧実装は「抽出湯量」入力だった。豆量 = 湯量 / 10 で等価
    const cases = [
      { doseG: 15, parts: "1", milk: 1350, finished: 1500 },
      { doseG: 15, parts: "4", milk: 225, finished: 375 },
      { doseG: 15, parts: "7", milk: 64, finished: 214 },
      { doseG: 15, parts: "10", milk: 0, finished: 150 },
      { doseG: 20.5, parts: "4", milk: 308, finished: 513 },
      { doseG: 30, parts: "7", milk: 129, finished: 429 },
    ];
    for (const { doseG, parts, milk, finished } of cases) {
      const computed = computeRecipe({
        recipe: cafeLatte,
        doseG,
        controls: { milk_ratio: parts },
      });
      expect(computed.totalWaterG).toBe(Math.round(doseG * 10));
      expect(computed.derived.find((d) => d.id === "milk")?.valueG).toBe(milk);
      expect(computed.derived.find((d) => d.id === "finished")?.valueG).toBe(finished);
    }
  });

  it("アイス（フラッシュブリュー）の お湯 / 氷 / 出来上がり量が旧実装と一致する", () => {
    const cases = [
      { doseG: 13, strength: "rich", hot: 101, ice: 68, finished: 169 },
      { doseG: 13, strength: "standard", hot: 117, ice: 78, finished: 195 },
      { doseG: 13, strength: "light", hot: 125, ice: 83, finished: 208 },
      { doseG: 17, strength: "rich", hot: 133, ice: 88, finished: 221 },
      { doseG: 17, strength: "light", hot: 163, ice: 109, finished: 272 },
      { doseG: 20, strength: "standard", hot: 180, ice: 120, finished: 300 },
      { doseG: 25, strength: "light", hot: 240, ice: 160, finished: 400 },
    ];
    for (const { doseG, strength, hot, ice, finished } of cases) {
      const computed = computeRecipe({
        recipe: flashBrew,
        doseG,
        controls: { flavor: "balanced", flash_strength: strength },
      });
      expect(computed.totalWaterG).toBe(hot);
      expect(computed.derived.find((d) => d.id === "ice")?.valueG).toBe(ice);
      expect(computed.derived.find((d) => d.id === "finished")?.valueG).toBe(finished);
      // 注湯合計はお湯と一致する
      expect(
        pours(computed)
          .map((s) => s.deltaWaterG)
          .reduce((a, b) => a + b, 0),
      ).toBe(hot);
    }
  });
});
