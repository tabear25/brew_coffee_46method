import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

/**
 * 擬似タイマー使用時は user-event 自身の待機（delay）を止め、
 * findBy* ではなく getBy* を使う（Testing Library の waitFor は
 * vitest の擬似タイマーを検知できず、ポーリングが進まないため）。
 */
function setup({ fakeTimers = false }: { fakeTimers?: boolean } = {}) {
  window.location.hash = "#/";
  // Radix のダイアログが body に pointer-events: none を付けるため、チェックを無効にする
  const user = userEvent.setup({
    pointerEventsCheck: 0,
    ...(fakeTimers ? { delay: null } : {}),
  });
  render(<App />);
  return user;
}

/** 制御された数値入力は change イベントで一度に置き換える */
function setDose(value: string) {
  fireEvent.change(screen.getByTestId("input-dose"), { target: { value } });
}

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = "#/";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("レシピ設定画面", () => {
  it("レシピを切り替えると計算値が更新される", async () => {
    const user = setup();

    // 既定は 4:6（20g / 300g）
    expect(screen.getByTestId("selected-recipe-name")).toHaveTextContent("粕谷哲 4:6 メソッド");
    expect(screen.getByTestId("summary-total-water")).toHaveTextContent("300");

    await user.click(screen.getByTestId("open-method-selector"));
    await user.click(await screen.findByTestId("recipe-option-blue_bottle_chemex_v1"));

    // Blue Bottle Chemex は 50g / 700g / 1:14
    expect(screen.getByTestId("selected-recipe-name")).toHaveTextContent("Blue Bottle Chemex");
    expect(screen.getByTestId("dose-display")).toHaveTextContent("50");
    expect(screen.getByTestId("summary-total-water")).toHaveTextContent("700");
    expect(screen.getByTestId("summary-ratio")).toHaveTextContent("1:14.0");
    expect(screen.getByTestId("summary-temperature")).toHaveTextContent("97");
  });

  it("固定湯量型のレシピでは豆量を変えても総湯量が変わらず、その旨が表示される", async () => {
    const user = setup();
    await user.click(screen.getByTestId("open-method-selector"));
    await user.click(await screen.findByTestId("recipe-option-george_howell_kalita_wave155_v1"));

    expect(screen.getByTestId("summary-total-water")).toHaveTextContent("265");
    expect(screen.getByTestId("warning-fixed_water")).toHaveTextContent("湯量265gが固定");
    expect(screen.getByTestId("summary-ratio")).toHaveTextContent("1:15.6");

    setDose("19");

    expect(screen.getByTestId("summary-total-water")).toHaveTextContent("265");
    expect(screen.getByTestId("summary-ratio")).toHaveTextContent("1:13.9");
  });

  it("豆量変更で総湯量と各投量が更新される", async () => {
    const user = setup();
    setDose("25");

    expect(screen.getByTestId("total-water")).toHaveTextContent("375g");
    expect(screen.getByTestId("summary-total-water")).toHaveTextContent("375");

    // プレビューで各投量が反映されていることを確認する（25g → 375g → 5投 × 75g）
    await user.click(screen.getByTestId("start-brew"));
    expect(await screen.findByTestId("step-delta-pour-1")).toHaveTextContent("+75");
    expect(screen.getByTestId("step-cumulative-pour-5")).toHaveTextContent("累計 375g");
  });

  it("推奨粉量範囲を外れるとエラーではなく警告が出る", async () => {
    const user = setup();
    await user.click(screen.getByTestId("open-method-selector"));
    await user.click(await screen.findByTestId("recipe-option-hoffmann_better_1cup_v1"));

    expect(screen.queryByTestId("warning-dose_range")).not.toBeInTheDocument();

    setDose("25");

    const warning = screen.getByTestId("warning-dose_range");
    expect(warning).toHaveTextContent("このレシピは12〜20gでの使用を想定しています");
    // 計算そのものは止まらない（25 × 16.6667 = 416.7 → 417g）
    expect(screen.getByTestId("summary-total-water")).toHaveTextContent("417");
  });

  it("味の方向性を変えると前半 2 投の配分が変わる", async () => {
    const user = setup();
    await user.click(screen.getByTestId("control-flavor-sweet"));
    await user.click(screen.getByTestId("start-brew"));

    // 20g / 300g の甘め = 50g + 70g（公式値）
    expect(await screen.findByTestId("step-delta-pour-1")).toHaveTextContent("+50");
    expect(screen.getByTestId("step-delta-pour-2")).toHaveTextContent("+70");
  });

  it("アレンジモードで比率を変えると「原法から変更」が表示される", async () => {
    const user = setup();
    expect(screen.queryByTestId("arranged-notice")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("mode-arranged"));
    const slider = within(screen.getByTestId("arrange-ratio")).getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByTestId("arranged-notice")).toHaveTextContent("原法から変更されています");
    expect(screen.getByTestId("summary-ratio")).toHaveTextContent("1:15.5");
  });
});

describe("抽出手順プレビュー", () => {
  it("全ステップと状態確認ステップが一覧表示される", async () => {
    const user = setup();
    await user.click(screen.getByTestId("open-method-selector"));
    await user.click(await screen.findByTestId("recipe-option-cafec_osmotic_flow_v1"));
    await user.click(screen.getByTestId("start-brew"));

    const list = await screen.findByTestId("brew-step-list");
    expect(within(list).getAllByRole("article")).toHaveLength(5);
    // 排水状態で進むステップは「要確認」として示す
    expect(within(list).getAllByText("要確認").length).toBeGreaterThan(0);
    expect(screen.getByTestId("step-time-pour-1")).toHaveTextContent("0:00");
    expect(screen.getByTestId("step-time-pour-2")).toHaveTextContent("目安");
  });
});

describe("抽出タイマー画面", () => {
  /** 設定画面 → プレビュー → タイマー開始まで進める */
  async function startTimer(user: ReturnType<typeof setup>) {
    await user.click(screen.getByTestId("start-brew"));
    await user.click(screen.getByTestId("start-timer"));
  }

  it("タイマーを開始、一時停止、再開、リセットできる", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const user = setup({ fakeTimers: true });
    await startTimer(user);

    expect(screen.getByTestId("elapsed-time")).toHaveTextContent("0:00");
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("1投目（味）");
    expect(screen.getByTestId("current-delta")).toHaveTextContent("+60");

    // 3 秒進める
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId("elapsed-time")).toHaveTextContent("0:03");

    // 一時停止すると経過時間が止まる
    await user.click(screen.getByTestId("control-pause"));
    expect(screen.getByTestId("paused-badge")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("elapsed-time")).toHaveTextContent("0:03");

    // 再開すると停止分を除いて進む
    await user.click(screen.getByTestId("control-resume"));
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("elapsed-time")).toHaveTextContent("0:05");

    // リセットで設定画面へ戻る
    await user.click(screen.getByTestId("control-reset"));
    expect(screen.getByTestId("start-brew")).toBeInTheDocument();
  });

  it("時刻条件のステップは自動で進む", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const user = setup({ fakeTimers: true });
    await startTimer(user);
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("1投目（味）");

    // 4:6 の 2 投目は 0:45
    await act(async () => {
      vi.advanceTimersByTime(44_000);
    });
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("1投目（味）");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("2投目（味）");
    expect(screen.getByTestId("current-cumulative")).toHaveTextContent("120");
  });

  it("状態条件のステップは時間が経っても自動進行せず、確認ボタンを出す", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const user = setup({ fakeTimers: true });

    await user.click(screen.getByTestId("open-method-selector"));
    await user.click(screen.getByTestId("recipe-option-cafec_osmotic_flow_v1"));
    await startTimer(user);

    // 1 投目のあとは排水状態の確認待ちになり、2 分経っても自動では進まない
    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("1投目（中心一点）");
    expect(screen.getByTestId("manual-condition-prompt")).toHaveTextContent(
      "状態を確認してください",
    );

    await user.click(screen.getByTestId("confirm-condition"));
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("2投目");
  });

  it("「次へ」「前へ」で手動でもステップを動かせる", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const user = setup({ fakeTimers: true });
    await startTimer(user);
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("1投目（味）");

    await user.click(screen.getByTestId("control-next"));
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("2投目（味）");

    await user.click(screen.getByTestId("control-previous"));
    expect(screen.getByTestId("current-step-title")).toHaveTextContent("1投目（味）");
  });

  it("抽出終了で完了状態になる", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const user = setup({ fakeTimers: true });
    await startTimer(user);

    await user.click(screen.getByTestId("control-finish"));
    expect(screen.getByText("抽出完了")).toBeInTheDocument();
  });

  it("再読み込みすると再開を確認するダイアログが出る（自動再開はしない）", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const user = setup({ fakeTimers: true });
    await startTimer(user);
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    // 再読み込み相当: localStorage を保ったまま、いったん破棄して最初から描画し直す
    cleanup();
    const user2 = setup({ fakeTimers: true });
    const dialog = screen.getByTestId("restore-session-dialog");
    expect(dialog).toHaveTextContent("抽出を再開しますか？");

    await user2.click(screen.getByTestId("restore-confirm"));
    expect(screen.getByTestId("elapsed-time")).toHaveTextContent("0:10");
    expect(screen.getByTestId("paused-badge")).toBeInTheDocument();
  });
});
