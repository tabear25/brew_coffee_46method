# Brew Mate — ハンドドリップ抽出シーケンサー

豆量を入れると、レシピごとの**総湯量・各投の注湯量・累計湯量・開始タイム・注ぎ方**を自動計算し、
そのまま**抽出中のタイマー**として使えるモバイルファーストの PWA です。

単なるレシピ一覧ではなく、**時刻条件**（0:45 に次を注ぐ）と**状態条件**（約70%落ちたら次を注ぐ）を
分けて扱う「抽出シーケンサー」として実装しています。

**フロント**: Vite 7 + React 18 + TypeScript 5.6 + Tailwind CSS 3 + shadcn/ui（Radix UI）+ wouter（ハッシュルーティング）
**状態管理**: React Context + `useReducer`（追加の状態管理ライブラリなし）
**テスト**: Vitest + React Testing Library ／ **PWA**: vite-plugin-pwa ／ **モバイル**: Capacitor 8（Android）

---

## 目次

- [できること](#できること)
- [収録レシピ](#収録レシピ)
- [起動方法](#起動方法)
- [テスト方法](#テスト方法)
- [ビルドとデプロイ](#ビルドとデプロイ)
- [アーキテクチャ](#アーキテクチャ)
- [計算ルール](#計算ルール)
- [レシピの追加方法](#レシピの追加方法)
- [データの扱いと出典](#データの扱いと出典)
- [Android（Capacitor）](#androidcapacitor)

---

## できること

### 1. レシピ設定画面（`#/`）

- **抽出メソッドの選択** — 13 レシピをダイアログから選択。お気に入り登録も可能
- **豆量の指定** — スライダー（0.5g 刻み）と数値入力（0.1g 刻み）の両方
- **味の方向性 / 濃さ** — レシピが宣言したコントロールだけが表示される（共通の味調整を全レシピへ強制しない）
- **原法モード / アレンジモード** — アレンジモードでは比率・湯温・挽き目を上書きでき、変更時は「原法から変更されています」と明示
- **算出結果** — 総湯量・比率・推奨湯温・推奨挽き目・抽出時間の目安・推定出来上がり量
- **警告** — 推奨粉量範囲を外れても止めずに警告。固定湯量型では「豆量を変えると比率が変わる」ことを明示
- **出典ダイアログ** — レシピ ID / version / 基準値 / 出典 / アプリ側で補完した値の一覧

### 2. 抽出手順プレビュー（`#/preview`）

全ステップをカードで一覧表示。各ステップに**ステップ番号・開始時刻・追加湯量・累計湯量・注湯秒数・
注ぎ方・攪拌・次へ進む条件・短い説明**を表示します。

### 3. 抽出タイマー画面（`#/timer`）

- 経過時間（大きな数字）／ 現在のステップ ／ 今回追加する湯量 ／ 目標累計湯量 ／ 注ぎ方 ／ 次のステップまでの秒数 ／ 全体の進捗
- **時刻条件のステップは自動で進行**。**状態条件のステップは自動進行せず**「約70%落ちた」「点滴状になった」「粉面付近まで水位が下がった」などの確認ボタンを表示
- 一時停止 / 再開 / 次へ / 前へ / リセット / 抽出終了
- 経過時間は `setInterval` の加算ではなく**開始時刻と現在時刻の差**から算出するため、タブが非アクティブになってもずれません
- Screen Wake Lock API / ステップ切り替え音 / バイブレーション（いずれも設定で ON/OFF、非対応環境では自動的に無効）
- ページ再読み込み後は**自動再開せず**「抽出を再開しますか？」と確認します

### アクセシビリティ

- すべてのボタン・入力に label、タップ領域は最低 44px
- 色だけで状態を示さない（選択にはチェックアイコン、警告には種別テキストを併記）
- タイマーの数字はスクリーンリーダーへ通知せず、`aria-live` は**ステップ変更時のみ**
- フォーカスリングを消さない／ダイアログは Radix のフォーカストラップ
- `prefers-reduced-motion` / `prefers-reduced-transparency` / `prefers-contrast` に対応
- キーボードショートカット（Space / ← → / N / P / Enter）と、その一覧を設定ダイアログに掲載

---

## 収録レシピ

### 調査レポート収録レシピ（10 件）

| # | レシピ | 基準 | 湯温 | 進行 |
| --- | --- | --- | --- | --- |
| 1 | 粕谷哲 4:6 メソッド | 20g / 300g / 1:15 | 92℃ | 時刻 |
| 2 | James Hoffmann Better 1 Cup | 15g / 250g / 1:16.7 | 100℃ | 時刻 |
| 3 | Scott Rao Official V60（20g / 330g） | 20g / 330g / 1:16.5 | 97℃ | 時刻＋状態 |
| 4 | Matt Winton 5-Pour | 20g / 300g / 1:15 | 93→88℃ | 時刻 |
| 5 | Lance Hedrick 1-2-1 | 18g / 306g / 1:17 | 100℃ | 時刻 |
| 6 | April 6 Aggressive Pulses | 20g / 300g / 1:15 | 92℃ | 時刻 |
| 7 | CAFEC Osmotic Flow | 15g / 250g / 1:16.7 | 90℃ | 状態 |
| 8 | George Howell Kalita Wave 155 | 16〜19g / **265g 固定** | 95℃ | 時刻 |
| 9 | KONO 名門 点滴法 | 24g / 240g / 1:10 | 82℃ | 時刻＋状態 |
| 10 | Blue Bottle Chemex | 50g / 700g / 1:14 | 97℃ | 時刻＋状態 |

### Brew Mate 独自メソッド（3 件・調査レポート外）

| レシピ | 内容 |
| --- | --- |
| 10:10 メソッド | 湯量を 10 等分。蒸らし 45 秒＋以降 30 秒間隔で 10 投 |
| カフェラテ | 豆:湯 = 1:10 で 5 投。コーヒー:ミルクの配分（1:9〜10:0）から必要ミルク量を算出 |
| アイス（フラッシュブリュー） | 出来上がり総量の 40% を氷として先入れし、残り 60% を 4:6 構造で注いで急冷 |

---

## 起動方法

Node.js v20 以上が必要です。

```bash
npm install     # 依存インストール
npm run dev     # 開発サーバ（http://localhost:5173）
```

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | Web ビルド（`vite build` → `dist/public/`、Service Worker と manifest も生成） |
| `npm run preview` | ビルド結果をローカル配信して確認 |
| `npm run check` | 型チェック（`tsc`） |
| `npm test` | テスト実行（Vitest、1 回だけ実行） |
| `npm run test:watch` | テストのウォッチ実行 |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run build:android` | Android 向けビルド（`vite build` → `cap sync android`） |
| `npm run open:android` | Android Studio で `android/` を開く |

---

## テスト方法

```bash
npm test          # 全テスト（計算ロジック + レシピ検証 + UI）
npm run check     # 型チェック
npm run lint      # Lint
```

`client/src/tests/` に以下を用意しています。

| ファイル | 内容 |
| --- | --- |
| `recipe-calculator.test.ts` | 総湯量・累計/追加湯量・丸め・流量からの注湯時間・警告・状態条件の非自動進行 |
| `brew-clock.test.ts` | 一時停止時間の除外、tick 取りこぼし耐性 |
| `recipe-data.test.ts` | 全レシピのバリデーション（ID 重複・version・ステップ順・累計割合の単調増加・100% 到達・負の湯量・時刻の逆行・推奨範囲・source metadata） |
| `legacy-parity.test.ts` | 旧 `brew-calculator.ts` から移植した 3 メソッドの数値パリティ |
| `ui.test.tsx` | レシピ切替・豆量変更・警告・アレンジ・プレビュー・タイマー（開始/一時停止/再開/リセット/自動進行/状態確認/復元） |

> **レシピデータの検証は開発時にエラーになります。**
> `client/src/data/recipes/index.ts` が `import.meta.env.DEV` のとき `assertRecipesValid()` を実行し、
> 不正なレシピがあれば黙って補正せず例外を投げます。

---

## ビルドとデプロイ

```bash
npm run build     # → dist/public/
```

出力は完全な静的サイト（バックエンド不要）です。`vite.config.ts` で `base: "./"`（相対パス）に
しているため、サブパス配信でも動きます。

| ホスティング | 設定 |
| --- | --- |
| **Cloudflare Pages** | Build command `npm run build` / Build output directory `dist/public` |
| **Vercel** | Framework `Vite` / Build command `npm run build` / Output directory `dist/public` |
| **Netlify** | Build command `npm run build` / Publish directory `dist/public` |
| **Render** | リポジトリ同梱の `render.yaml`（Static Site）をそのまま使用 |
| **GitHub Pages** | `dist/public` を公開。相対パスなのでサブパスでも動作 |

SPA のルーティングは**ハッシュルーティング**（`#/preview` など）なので、リライト設定は不要です。

### PWA

`vite build` で `manifest.webmanifest` と `sw.js` が生成され、ブラウザからインストールできます
（ホーム画面に追加 → スタンドアロン表示）。
Service Worker の登録は `client/src/main.tsx` で行い、**Capacitor（Android の WebView）で動作中は登録しません**
（ネイティブはアプリ更新で資産が差し替わるため、SW のキャッシュが古い画面を固定してしまうのを避ける）。

---

## アーキテクチャ

```
client/src/
├── domain/                     # UI 非依存のドメイン層
│   ├── recipe.types.ts         # Recipe / RecipeStep / StartCondition / FlavorControl
│   ├── brew.types.ts           # BrewStatus / ComputedRecipe / ComputedStep / BrewSettings
│   ├── recipe-calculator.ts    # 総湯量・累計目標・追加量・警告・推定出来上がり量
│   ├── timeline-builder.ts     # 開始時刻と所要秒の組み立て（時刻条件 / 状態条件を分離）
│   ├── recipe-validator.ts     # レシピデータの検証（開発時は例外）
│   ├── brew-clock.ts           # 開始時刻・停止時刻・累計停止時間から経過時間を算出
│   └── brew-progression.ts     # 次のステップへ進む条件（自動 / 要確認）
├── data/recipes/               # レシピ（1 レシピ 1 ファイル）
├── stores/brew-store.tsx       # Context + useReducer + localStorage 永続化
├── hooks/
│   ├── use-brew-timer.ts       # 経過時間・自動進行・音/バイブ・Wake Lock
│   └── use-wake-lock.ts        # Screen Wake Lock API（非対応時フォールバック）
├── components/
│   ├── app-shell.tsx           # AppShell（最大幅 600px）
│   ├── recipe/                 # MethodSelector / DoseControl / FlavorControl / StrengthControl /
│   │                           # RangeControl / RecipeControls / RecipeSummary / ArrangePanel /
│   │                           # UnsupportedRangeWarning / RecipeSourceDialog / SettingsDialog
│   ├── brew/                   # BrewTimer / TimerControls / BrewStepList / BrewStepCard /
│   │                           # ManualConditionPrompt / ProgressIndicator / RestoreSessionDialog
│   └── ui/                     # shadcn/ui（Radix ベース）
├── lib/                        # format / labels / storage / feedback（音・バイブ）
├── pages/                      # setup / preview / timer / not-found
└── tests/
```

### 状態

| 状態 | 置き場所 |
| --- | --- |
| 選択中レシピ / 豆量 / 味設定 / モード / アレンジ / 設定 / お気に入り | `prefs`（`localStorage: brew-mate:prefs:v1`） |
| 抽出状態・現在のステップ・開始時刻・一時停止開始時刻・累計停止時間 | `session`（`localStorage: brew-mate:session:v1`） |
| 計算済みレシピ | `useMemo` による導出（保存しない） |

```ts
type BrewStatus =
  | "idle" | "preview" | "running" | "paused" | "waiting_for_confirmation" | "completed";
```

---

## 計算ルール

### 総湯量

```ts
// 比率型
totalWaterG = roundTo(doseG * ratio, recipe.scaling.roundingG)
// 固定湯量型（豆量を変えても総湯量は変わらない = 比率が変わる）
totalWaterG = reference.waterG
```

### ステップ湯量

各ステップの追加量を個別に丸めると誤差が積み上がるため、**先に累計目標を丸めてから差分を取ります**。

```ts
cumulativeTarget[i] = roundTo(totalWaterG * cumulativeFraction[i], roundingG)
deltaWater[i]       = cumulativeTarget[i] - cumulativeTarget[i - 1]
```

最後の注湯ステップの累計は必ず総湯量と一致させます。
ブルームが豆量倍率で決まるレシピ（Rao / 1-2-1）は `bloomWaterG = roundTo(doseG * 3, roundingG)`。

### 注湯時間

```ts
pourDurationSec = deltaWaterG / flowRateGps
```

**時刻は豆量に比例させません。**「ブルーム待ち時間」「注湯開始時刻」「投間隔」は固定値、
「1 投あたりの注湯時間」だけを流量から再計算します。

### 推定出来上がり量

```ts
estimatedBeverageG = totalWaterG - doseG * absorptionFactor   // absorptionFactor の初期値は 2.0
```

`absorptionFactor` は設定ダイアログで変更できます。UI では必ず「**推定**出来上がり量」と明記し、
レシピの正式な湯量とは区別しています。

---

## レシピの追加方法

### 1. レシピファイルを作る

`client/src/data/recipes/<your-recipe>.ts` を新規作成します。

```ts
import type { Recipe } from "@/domain/recipe.types";
import { finishStep } from "./_shared";

export const yourRecipe: Recipe = {
  id: "your_recipe_v1",        // 一意。同じメソッドの別バージョンは別 ID にする
  version: "1.0.0",            // x.y.z 形式
  name: "レシピ名",
  shortName: "短い名前",
  author: "作者名",             // 任意
  description: "1〜2 行の説明。",
  sourceType: "original",      // original | official_partner | adaptation
  group: "researched",         // researched（調査レポート収録）| app（独自）
  brewer: { family: "cone", models: ["Hario V60 02"], filter: "paper" },

  reference: {
    doseG: 20,
    waterG: 300,
    ratio: 15,                 // 固定湯量型では省略する
    temperatureC: 92,
    grind: { level: 8, label: "粗挽き" },   // level は 1=極細 〜 10=極粗
    targetFinishSec: 210,
    doseRangeG: [15, 25],
    doseRangeIsAppDefault: true,            // 出典に記載がない場合は必ず立てる
  },

  scaling: {
    water: "dose_ratio",        // dose_ratio | fixed_water | custom
    stepWater: "total_fraction",// total_fraction | dose_multiple | fixed_reference
    timing: "fixed_start_times",// fixed_start_times | flow_rate | state_dependent
    roundingG: 1,
  },

  steps: [
    {
      id: "pour-1",
      order: 1,
      type: "pour",
      startCondition: { type: "elapsed_time", valueSec: 0 },
      waterTarget: { mode: "cumulative_fraction", value: 0.2 },
      flowRateGps: 5,
      pattern: "gentle_spiral",
      title: "1投目",
      instruction: "中心から円を描いて注ぐ。",
    },
    finishStep(2, "落ちきるまで待つ。"),
  ],

  metadata: {
    sourceTitle: "出典のタイトル（必須）",
    sourceUrl: "https://example.com",
    notes: "補足・注意点",
  },
};
```

### 2. 一覧に登録する

`client/src/data/recipes/index.ts` の `RECIPES` 配列に追加します。

### 3. 検証する

```bash
npm test
```

`recipe-data.test.ts` が全レシピを検証します。次のいずれかに違反するとテストが落ちます。

- ID が重複している / `version` がない / `metadata.sourceTitle` がない
- ステップ `order` が重複・非昇順 / ステップ `id` が重複
- 累計割合が単調増加しない / 最後の累計割合が 100% にならない
- 最終湯量が総湯量と一致しない / 負の湯量がある
- 固定開始時刻が逆行している / 注湯ステップに `waterTarget` がない
- 推奨粉量範囲の最小値が最大値を超えている / 基準豆量が推奨範囲の外にある
- `reference.doseG × ratio` が `reference.waterG` と一致しない

### 投数や配分が可変のレシピ

コントロールで投数・配分が変わるレシピは `flavorControls` を宣言し、`buildSteps(controls)` を実装します
（`kasuya-46.ts` が実例）。**湯量は割合で表すため `buildSteps` は豆量に依存しない純粋関数**です。
`steps` には既定コントロールでの `buildSteps` 出力をそのまま入れてください（検証で一致を確認します）。

ミルク量・氷量などの派生値は `derive(ctx)` で返します（`cafe-latte.ts` / `flash-brew.ts` が実例）。

### 状態条件で進めるステップ

排水状態・水位で進めるステップは `startCondition` に以下を使います。タイマーは**自動進行せず**、
`label` の文言をそのまま確認ボタンに表示します。

```ts
{ type: "outflow_state", value: "seventy_percent_drained", label: "約70%落ちた" }
{ type: "outflow_state", value: "slow_drip",               label: "点滴状になった" }
{ type: "water_level",   value: "near_bed",                label: "粉面付近まで水位が下がった" }
{ type: "water_level",   value: "partially_drained",       label: "水位が下がった" }
{ type: "manual_confirm",                                   label: "次の注湯へ" }
```

表示用の目安時刻は `estimateSec` に入れます（**進行判定には使いません**）。

---

## データの扱いと出典

数値は調査レポート「ハンドドリップ抽出レシピ10選と自動計算用データ設計」を Source of Truth として
データ化しています。推測で数値を足していないことを保証するため、出典にない値には必ず印を付けています。

| 印 | 意味 | 表示 |
| --- | --- | --- |
| `RecipeStep.adaptation` + `adaptationNote` | 注湯開始時刻などを一般に流通するタイムラインで補完 | ステップカードに「補完値」バッジ／出典ダイアログに理由 |
| `reference.doseRangeIsAppDefault` | 推奨粉量範囲が出典になくアプリ既定値 | 警告文と出典ダイアログに明記 |
| `reference.temperatureIsAppDefault` / `grind.isAppDefault` | 湯温・挽き目が出典になくアプリ既定値 | 出典ダイアログに明記 |
| `RecipeControlOption.adaptation` | 選択肢に数値根拠がない | 「派生」バッジ／選ぶと「原法から変更されています」 |

同じ作者・同じメソッド名でも複数版があるため、**author だけをキーにせず、一意な `id` と `version`** を
持たせています（例: Scott Rao の `20g / 330g` 版と `22g / 352g` 版は別 ID にする）。

### 4:6 メソッドの味の方向性について

- **甘め = 42 : 58** — 調査レポートの「第1投42%、第2投58%（公式 20g 例は 50g＋70g）」に準拠。20g では 50g + 70g になります
- **バランス = 50 : 50**
- **明るめ = 58 : 42** — レポートは「第1投を第2投より大きくする」と方向性のみを示し、数値根拠がないため
  `adaptation` 扱い。選ぶと「原法から変更されています」が表示されます

---

## Android（Capacitor）

既存の Vite ビルド（`dist/public`）をネイティブ WebView で包む構成です。React / 計算ロジックは無変更。

- 設定: `capacitor.config.ts`（`appId: com.tabear25.brew46` / `appName: Brew Mate` / `webDir: dist/public`）
- **重要**: `client/` を変更したら必ず `npm run build:android`（= `vite build && cap sync android`）で
  Android 側へ同期してください。`cap sync` を忘れると WebView が古い画面のままになります
- APK の実ビルドには Android SDK / Google Maven（`dl.google.com`）への到達が必要です。
  ネットワーク許可リストでブロックされる環境では `gradlew` ビルドが失敗します
- GitHub Actions（`.github/workflows/android-apk.yml`）で debug APK をビルドし、成果物として取得できます
