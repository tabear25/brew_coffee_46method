import { describe, expect, it } from "vitest";
import {
  computeCumulativeTargets,
  computeRecipe,
  computeTotalWater,
  roundTo,
  toDeltas,
} from "@/domain/recipe-calculator";
import { scheduledStartSec, shouldAdvance } from "@/domain/brew-progression";
import { resolveSteps, withControlDefaults } from "@/domain/recipe.types";
import {
  cafecOsmoticFlow,
  georgeHowellKalita,
  hoffmannBetterOneCup,
  kasuya46,
  lanceHedrick121,
  mattWintonFivePour,
  nagasakiJbrc2026,
  scottRaoV60,
} from "@/data/recipes";

/** 注湯ステップの追加量だけを取り出す */
function pourDeltas(computed: ReturnType<typeof computeRecipe>): number[] {
  return computed.steps.filter((s) => s.step.type === "pour").map((s) => s.deltaWaterG);
}

describe("総湯量の計算", () => {
  it("1. 15g × 1:16.6667 が約250gになる", () => {
    expect(computeTotalWater(hoffmannBetterOneCup, 15)).toBe(250);
    expect(hoffmannBetterOneCup.reference.ratio).toBeCloseTo(16.6667, 4);
  });

  it("2. 総湯量300gを5等分すると60gずつになる", () => {
    const computed = computeRecipe({ recipe: mattWintonFivePour, doseG: 20 });
    expect(computed.totalWaterG).toBe(300);
    expect(pourDeltas(computed)).toEqual([60, 60, 60, 60, 60]);
  });

  it("3. 総湯量の20%刻みが最後に必ず100%へ到達する", () => {
    const computed = computeRecipe({ recipe: hoffmannBetterOneCup, doseG: 15 });
    const cumulative = computed.steps
      .filter((s) => s.step.type === "pour")
      .map((s) => s.cumulativeWaterG);
    expect(cumulative).toEqual([50, 100, 150, 200, 250]);
    expect(cumulative[cumulative.length - 1]).toBe(computed.totalWaterG);
  });

  it("4. 小数を含む豆量でも丸め誤差で総湯量がずれない", () => {
    for (const doseG of [15.3, 17.7, 18.1, 19.9, 21.4]) {
      const computed = computeRecipe({ recipe: kasuya46, doseG });
      const sum = pourDeltas(computed).reduce((a, b) => a + b, 0);
      expect(sum).toBe(computed.totalWaterG);
      expect(computed.totalWaterG).toBe(Math.round(doseG * 15));
    }
  });

  it("5. 最後の追加湯量を調整して総量を一致させる", () => {
    // 後半4投 + 前半2投 = 6投。300 や 225 のように割り切れない配分でも合計は一致する
    const computed = computeRecipe({
      recipe: kasuya46,
      doseG: 15,
      controls: { flavor: "balanced", strength: "strong" },
    });
    const deltas = pourDeltas(computed);
    expect(deltas.reduce((a, b) => a + b, 0)).toBe(225);
    const last = computed.steps.filter((s) => s.step.waterTarget).at(-1);
    expect(last?.cumulativeWaterG).toBe(computed.totalWaterG);
  });

  it("6. 固定湯量型で豆量を変えても総湯量が変化しない", () => {
    for (const doseG of [16, 17, 18, 19, 25]) {
      const computed = computeRecipe({ recipe: georgeHowellKalita, doseG });
      expect(computed.totalWaterG).toBe(265);
    }
    // 豆量を変えると比率のほうが動く
    expect(computeRecipe({ recipe: georgeHowellKalita, doseG: 16 }).ratio).toBeCloseTo(16.56, 2);
    expect(computeRecipe({ recipe: georgeHowellKalita, doseG: 19 }).ratio).toBeCloseTo(13.95, 2);
  });

  it("7. 豆量倍率型ブルームが正しく計算される", () => {
    const rao = computeRecipe({ recipe: scottRaoV60, doseG: 20 });
    expect(rao.steps[0].deltaWaterG).toBe(60); // 20g × 3
    expect(computeRecipe({ recipe: scottRaoV60, doseG: 22 }).steps[0].deltaWaterG).toBe(66);

    const hedrick = computeRecipe({ recipe: lanceHedrick121, doseG: 18 });
    expect(hedrick.steps[0].deltaWaterG).toBe(54); // 18g × 3
    expect(hedrick.totalWaterG).toBe(306);
    // 残りは 1 投で入れきる
    const mainPour = hedrick.steps.find((s) => s.step.id === "main-pour");
    expect(mainPour?.deltaWaterG).toBe(252);
  });

  it("8. 推奨粉量範囲外の警告が表示される", () => {
    const inRange = computeRecipe({ recipe: hoffmannBetterOneCup, doseG: 15 });
    expect(inRange.warnings.find((w) => w.id === "dose_range")).toBeUndefined();

    const outOfRange = computeRecipe({ recipe: hoffmannBetterOneCup, doseG: 25 });
    const warning = outOfRange.warnings.find((w) => w.id === "dose_range");
    expect(warning).toBeDefined();
    expect(warning?.level).toBe("warning");
    expect(warning?.message).toContain("このレシピは12〜20gでの使用を想定しています");
    expect(warning?.message).toContain("抽出時間や挽き目の再調整が必要になる可能性があります");
    // 警告であって計算は止めない
    expect(outOfRange.totalWaterG).toBeGreaterThan(0);
  });
});

describe("丸めと累計", () => {
  it("累計を丸めてから差分を取るので誤差が積み上がらない", () => {
    const steps = resolveSteps(kasuya46, withControlDefaults(kasuya46));
    const cumulative = computeCumulativeTargets(steps, 333, 22.2, 1);
    const deltas = toDeltas(cumulative);
    expect(deltas.reduce((a, b) => a + b, 0)).toBe(333);
    // 累計は単調非減少
    for (let i = 1; i < cumulative.length; i++) {
      expect(cumulative[i]).toBeGreaterThanOrEqual(cumulative[i - 1]);
    }
  });

  it("roundTo は 0.5 刻みでも浮動小数の端数を残さない", () => {
    expect(roundTo(250.4, 1)).toBe(250);
    expect(roundTo(250.5, 1)).toBe(251);
    expect(roundTo(12.26, 0.5)).toBe(12.5);
    expect(roundTo(12.24, 0.5)).toBe(12);
  });
});

describe("注湯時間", () => {
  it("流量から注湯秒数を再計算する（時刻を豆量に比例させない）", () => {
    const small = computeRecipe({ recipe: hoffmannBetterOneCup, doseG: 12 });
    const large = computeRecipe({ recipe: hoffmannBetterOneCup, doseG: 20 });

    // 注湯量が増えれば注湯秒数も増える
    expect(small.steps[0].durationSec).toBe(Math.round(small.steps[0].deltaWaterG / 5));
    expect(large.steps[0].durationSec).toBe(Math.round(large.steps[0].deltaWaterG / 5));
    expect(large.steps[0].durationSec!).toBeGreaterThan(small.steps[0].durationSec!);

    // 一方で固定の開始時刻は豆量に依存しない
    const startsOf = (c: typeof small) =>
      c.steps
        .map((s) => s.step.startCondition)
        .map((c2) => (c2.type === "elapsed_time" ? c2.valueSec : null));
    expect(startsOf(small)).toEqual(startsOf(large));
  });
});

describe("状態条件のステップ", () => {
  it("9. 状態依存ステップが時間経過だけで自動進行しない", () => {
    const computed = computeRecipe({ recipe: cafecOsmoticFlow, doseG: 15 });
    const stateIndex = computed.steps.findIndex((s) => s.requiresConfirmation);
    expect(stateIndex).toBeGreaterThan(0);

    const stepStartedSec = [0];
    expect(scheduledStartSec(computed, stepStartedSec, stateIndex)).toBeNull();
    // どれだけ時間が経っても自動では進まない
    expect(shouldAdvance(computed, stepStartedSec, stateIndex, 10)).toBe(false);
    expect(shouldAdvance(computed, stepStartedSec, stateIndex, 9999)).toBe(false);

    // 時刻条件のステップは進む
    const timed = computeRecipe({ recipe: mattWintonFivePour, doseG: 20 });
    expect(shouldAdvance(timed, [0], 1, 29)).toBe(false);
    expect(shouldAdvance(timed, [0], 1, 30)).toBe(true);
  });

  it("after_previous は前ステップの実績開始時刻から計算される", () => {
    const computed = computeRecipe({ recipe: hoffmannBetterOneCup, doseG: 15 });
    // index 2 = 2投目（elapsed_time 45）、index 3 = 3投目（after_previous +10秒）
    expect(scheduledStartSec(computed, [0, 10, 45], 3)).toBe(45 + 10 + 10);
    // 前ステップの実績がなければ確定しない
    expect(scheduledStartSec(computed, [0, 10], 3)).toBeNull();
  });
});

describe("出典の開示", () => {
  it("データ側の補完と、ユーザーによる変更を分けて開示する", () => {
    // Scott Rao: 2投目の開始時刻だけをアプリ側で補完している（ユーザーは何も変えていない）
    const rao = computeRecipe({ recipe: scottRaoV60, doseG: 20 });
    expect(rao.isArranged).toBe(false);
    expect(rao.arrangedReasons).toEqual([]);
    expect(rao.supplementedNotes.join()).toContain("0:45 開始は調査レポートに記載がなく");

    // 4:6 の「明るめ」はユーザーが選んだ、数値根拠のない設定
    const bright = computeRecipe({
      recipe: kasuya46,
      doseG: 20,
      controls: { flavor: "bright" },
    });
    expect(bright.isArranged).toBe(true);
    expect(bright.arrangedReasons.join()).toContain("数値根拠なし");

    // 既定設定の 4:6 はどちらの注記も立たない（推奨粉量範囲のアプリ既定値だけ開示される）
    const plain = computeRecipe({ recipe: kasuya46, doseG: 20 });
    expect(plain.isArranged).toBe(false);
    expect(plain.supplementedNotes.join()).toContain("推奨粉量範囲");
  });

  it("アレンジモードで上書きすると変更内容が列挙される", () => {
    const arranged = computeRecipe({
      recipe: kasuya46,
      doseG: 20,
      mode: "arranged",
      arrangement: { ratio: 16, temperatureC: 88 },
    });
    expect(arranged.totalWaterG).toBe(320);
    expect(arranged.temperatureC).toBe(88);
    expect(arranged.isArranged).toBe(true);
    expect(arranged.arrangedReasons).toContain("比率を 1:16 に変更");
    expect(arranged.arrangedReasons).toContain("湯温を 88℃ に変更");
  });

  it("原法モードではアレンジの上書きを無視する", () => {
    const original = computeRecipe({
      recipe: kasuya46,
      doseG: 20,
      mode: "original",
      arrangement: { ratio: 16 },
    });
    expect(original.totalWaterG).toBe(300);
    expect(original.isArranged).toBe(false);
  });
});

describe("1 投固定量型（長崎愛美 JBrC 2026）", () => {
  const recipe = nagasakiJbrc2026;
  const poursOf = (computed: ReturnType<typeof computeRecipe>) =>
    computed.steps.filter((s) => s.step.type === "pour");

  it("基準 17.5g では 210g（1:12）を 30g × 7 投、20 秒間隔で注ぐ", () => {
    const computed = computeRecipe({ recipe, doseG: 17.5 });
    const pours = poursOf(computed);
    expect(computed.totalWaterG).toBe(210);
    expect(computed.ratio).toBe(12);
    expect(pourDeltas(computed)).toEqual([30, 30, 30, 30, 30, 30, 30]);
    expect(pours.map((s) => s.cumulativeWaterG)).toEqual([30, 60, 90, 120, 150, 180, 210]);
    expect(pours.map((s) => s.startSec)).toEqual([0, 20, 40, 60, 80, 100, 120]);
    // 4 投目（1:00）まで 90℃、5 投目（1:20）から 75℃
    expect(pours.map((s) => s.temperatureC)).toEqual([90, 90, 90, 90, 75, 75, 75]);
    // 出典どおりなので、ステップに補完の印は付かない
    expect(computed.steps.some((s) => s.step.adaptation)).toBe(false);
    expect(computed.isArranged).toBe(false);
  });

  it("豆量を変えても 1 投 30g と 20 秒間隔は変わらず、投数が変わる", () => {
    const large = computeRecipe({ recipe, doseG: 20 });
    expect(large.totalWaterG).toBe(240);
    expect(pourDeltas(large)).toEqual([30, 30, 30, 30, 30, 30, 30, 30]);
    expect(poursOf(large).map((s) => s.startSec)).toEqual([0, 20, 40, 60, 80, 100, 120, 140]);

    const small = computeRecipe({ recipe, doseG: 15 });
    expect(small.totalWaterG).toBe(180);
    expect(pourDeltas(small)).toEqual([30, 30, 30, 30, 30, 30]);
    expect(poursOf(small).map((s) => s.startSec)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it("30g で割り切れない湯量は最後の 1 投で総湯量に合わせる", () => {
    // 18g → 216g → 7 投 / 16.5g → 198g → 7 投 / 19g → 228g → 8 投
    expect(pourDeltas(computeRecipe({ recipe, doseG: 18 }))).toEqual([30, 30, 30, 30, 30, 30, 36]);
    expect(pourDeltas(computeRecipe({ recipe, doseG: 16.5 }))).toEqual([
      30, 30, 30, 30, 30, 30, 18,
    ]);
    expect(pourDeltas(computeRecipe({ recipe, doseG: 19 }))).toEqual([
      30, 30, 30, 30, 30, 30, 30, 18,
    ]);

    // 0.1g 刻みのどの豆量でも: 最後以外は 30g、最後は 15g 以上 45g 未満、合計は総湯量
    for (let tenths = 10; tenths <= 400; tenths++) {
      const doseG = tenths / 10;
      const computed = computeRecipe({ recipe, doseG });
      const deltas = pourDeltas(computed);
      const last = deltas[deltas.length - 1];
      expect(
        deltas.reduce((a, b) => a + b, 0),
        `${doseG}g`,
      ).toBe(computed.totalWaterG);
      expect(
        deltas.slice(0, -1).every((d) => d === 30),
        `${doseG}g`,
      ).toBe(true);
      if (deltas.length > 1) {
        expect(last, `${doseG}g`).toBeGreaterThanOrEqual(15);
        expect(last, `${doseG}g`).toBeLessThan(45);
      }
    }
  });

  it("75℃ に切り替える位置は投数比 4:3 に近づけ、7 投以外では補完値として開示する", () => {
    // 8 投 → 90℃ 5 投・75℃ 3 投
    const large = computeRecipe({ recipe, doseG: 20 });
    expect(poursOf(large).map((s) => s.temperatureC)).toEqual([90, 90, 90, 90, 90, 75, 75, 75]);
    const adapted = large.steps.filter((s) => s.step.adaptation);
    expect(adapted.map((s) => s.step.id)).toEqual(["pour-6"]);
    expect(adapted[0].step.title).toContain("75℃に切替");
    expect(large.supplementedNotes.join()).toContain("投数比 4 : 3");
    // データ側の補完であって、ユーザーによる変更ではない
    expect(large.isArranged).toBe(false);

    // 6 投 → 90℃ 3 投・75℃ 3 投
    const small = computeRecipe({ recipe, doseG: 15 });
    expect(poursOf(small).map((s) => s.temperatureC)).toEqual([90, 90, 90, 75, 75, 75]);
  });

  it("抽出時間の目安は投数に合わせて延び縮みし、アプリ既定値として開示する", () => {
    const base = computeRecipe({ recipe, doseG: 17.5 });
    // 最終投 2:00 ＋ 落ちきり 30 秒（アプリ既定値）
    expect(base.estimatedFinishSec).toBe(150);
    expect(base.supplementedNotes).toContain("抽出時間の目安（基準 2:30）はアプリ既定値");
    expect(computeRecipe({ recipe, doseG: 20 }).estimatedFinishSec).toBe(170);
    expect(computeRecipe({ recipe, doseG: 15 }).estimatedFinishSec).toBe(130);
  });

  it("アレンジで比率を変えても 1 投 30g のまま、投数で総湯量に合わせる", () => {
    // 17.5g × 1:15 = 262.5 → 263g → 9 投（最後 23g）
    const arranged = computeRecipe({
      recipe,
      doseG: 17.5,
      mode: "arranged",
      arrangement: { ratio: 15 },
    });
    expect(arranged.totalWaterG).toBe(263);
    expect(pourDeltas(arranged)).toEqual([30, 30, 30, 30, 30, 30, 30, 30, 23]);
    expect(arranged.arrangedReasons).toContain("比率を 1:15 に変更");
  });
});

describe("推定出来上がり量", () => {
  it("総湯量 - 豆量 × 吸水係数 で計算し、吸水係数は設定値", () => {
    const base = computeRecipe({ recipe: kasuya46, doseG: 20, absorptionFactor: 2 });
    expect(base.estimatedBeverageG).toBe(300 - 40);

    const heavier = computeRecipe({ recipe: kasuya46, doseG: 20, absorptionFactor: 2.5 });
    expect(heavier.estimatedBeverageG).toBe(300 - 50);
  });
});
