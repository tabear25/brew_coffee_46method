# CLAUDE.md

このファイルは Claude Code（claude.ai/code）が本リポジトリで作業する際のガイドです。

## プロジェクト概要

**Brew Mate** — ハンドドリップ抽出シーケンサー。豆量を入れるとレシピごとの総湯量・各投の注湯量・累計湯量・
開始タイム・注ぎ方を自動計算し、そのまま抽出中のタイマーとして使える PWA。
フロントは **Vite 7 + React 18 + TypeScript 5.6 + Tailwind CSS 3 + shadcn/ui** の SPA（ハッシュルーティング）。

単なるレシピ電卓ではなく、**時刻条件**（0:45 に次を注ぐ）と**状態条件**（約70%落ちたら次を注ぐ）を
分けて扱う「抽出シーケンサー」であることが設計の核。

- 収録レシピは 13 件（調査レポート収録 10 件 ＋ Brew Mate 独自 3 件）。
- ディレクトリ名は歴史的経緯で `brew_cofee_46method`（`coffee` ではなく `cofee`）。

## 技術スタック

- **フロント**: React 18 / TypeScript 5.6 / Vite 7 / Tailwind CSS 3 / shadcn/ui（Radix UI）/ wouter（ハッシュルーティング）
- **状態**: React Context + `useReducer`（`client/src/stores/brew-store.tsx`）。重い状態管理ライブラリは不使用
- **テスト**: Vitest + React Testing Library（`client/src/tests/`）
- **PWA**: vite-plugin-pwa（`manifest.webmanifest` / `sw.js` を生成）
- **品質**: ESLint 9（flat config）/ Prettier
- **アイコン**: lucide-react / **テーマ**: 自前の `theme-provider.tsx`（ダーク既定・localStorage 永続化）
- **モバイル**: Capacitor 8（`android/` に Android プロジェクト）

## 開発コマンド

| コマンド | 用途 |
| --- | --- |
| `npm install` | 依存インストール |
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | Web ビルド（`vite build` → `dist/public/`） |
| `npm run preview` | ビルド結果のローカル配信 |
| `npm run check` | 型チェック（`tsc`） |
| `npm test` / `npm run test:watch` | テスト（Vitest） |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run build:android` | Android 向けビルド（`vite build` → `cap sync android`） |
| `npm run open:android` | Android Studio で `android/` を開く |

## アーキテクチャ

**レシピ（データ）と計算ロジックを分離する**のが最重要の約束。
レシピ固有の分岐を React コンポーネントに書かないこと。

### ドメイン層（UI 非依存・`client/src/domain/`）

| ファイル | 責務 |
| --- | --- |
| `recipe.types.ts` | `Recipe` / `RecipeStep` / `StartCondition` / `WaterTarget` / `FlavorControl` |
| `brew.types.ts` | `BrewStatus` / `ComputedRecipe` / `ComputedStep` / `BrewSettings` / `Arrangement` |
| `recipe-calculator.ts` | `computeRecipe()` が中核。総湯量・累計目標・追加量・警告・推定出来上がり量 |
| `timeline-builder.ts` | 開始時刻と所要秒の組み立て。時刻条件と状態条件を分離 |
| `recipe-validator.ts` | レシピデータの検証。`assertRecipesValid()` は開発時に例外を投げる |
| `brew-clock.ts` | 開始時刻・停止時刻・累計停止時間から経過時間を算出 |
| `brew-progression.ts` | 次のステップへ進む条件（自動進行できるか／要確認か） |

### 計算ルール（変更するときは必ずテストを確認する）

- **総湯量**: 比率型 `roundTo(doseG * ratio, roundingG)` ／ 固定湯量型 `reference.waterG`（豆量を変えても不変）
- **ステップ湯量**: 追加量を個別に丸めず、**累計目標を丸めてから差分を取る**。最終累計は必ず総湯量と一致
- **ブルーム**: 豆量倍率型は `roundTo(doseG * 3, roundingG)`（Rao / 1-2-1）
- **注湯時間**: `deltaWaterG / flowRateGps`。**時刻を豆量に比例させない**（ブルーム待ち・開始時刻・投間隔は固定値）
- **推定出来上がり量**: `totalWaterG - doseG * absorptionFactor`（初期値 2.0）。必ず「推定」と明記し正式湯量と混同しない

### データ（`client/src/data/recipes/`）

1 レシピ 1 ファイル。`index.ts` の `RECIPES` に登録する。
投数・配分が可変のレシピは `buildSteps(controls)`（豆量に依存しない純粋関数）を実装し、
`steps` には既定コントロールでの出力をそのまま入れる（検証で一致を確認している）。
ミルク量・氷量などの派生値は `derive(ctx)` で返す。

**推測で数値を足さないこと。** 出典にない値には必ず印を付ける。

| 印 | 意味 |
| --- | --- |
| `RecipeStep.adaptation` + `adaptationNote` | 注湯開始時刻などを一般に流通するタイムラインで補完した |
| `reference.doseRangeIsAppDefault` | 推奨粉量範囲がアプリ既定値 |
| `reference.temperatureIsAppDefault` / `grind.isAppDefault` | 湯温・挽き目がアプリ既定値 |
| `RecipeControlOption.adaptation` | その選択肢に数値根拠がない |

同じ作者・同じメソッド名でも複数版があるため、**author だけをキーにせず一意な `id` と `version`** を持たせる。

### 画面・状態

- **画面**: `pages/setup.tsx`（`#/`）→ `pages/preview.tsx`（`#/preview`）→ `pages/timer.tsx`（`#/timer`）
- **ルーティング**: `App.tsx`（wouter のハッシュルーティング）。`base: "./"` 相対パスでサブパス配信に対応
- **外枠**: `components/app-shell.tsx`（最大幅 600px・モバイルファースト）
- **状態**: `stores/brew-store.tsx`。`prefs`（`brew-mate:prefs:v1`）と `session`（`brew-mate:session:v1`）を
  localStorage に分けて保存。**再読み込み後は自動再開せず**「抽出を再開しますか？」と確認する
- **タイマー**: `hooks/use-brew-timer.ts`。経過時間は `setInterval` の加算ではなく
  **開始時刻と現在時刻の差**から算出（タブが非アクティブでもずれない）

### デザイン

ダークテーマ既定。黒ではなく温かみのあるダークブラウン（`--background: 24 20% 10%`）に
キャメル系アクセント（`--primary: 25 60% 58%`、背景比 6.2:1）。
タップ領域は最低 44px、色だけで状態を表さない、フォーカスリングを消さない、
`aria-live` はステップ変更時のみ、`prefers-reduced-motion` 対応。

## ディレクトリ構成（抜粋）

```
brew_cofee_46method/
├── vite.config.ts            # root=client / base="./" / 出力 dist/public / vite-plugin-pwa
├── vitest.config.ts          # jsdom + client/src/tests/setup.ts
├── eslint.config.js          # ESLint 9 flat config
├── capacitor.config.ts       # appId / appName / webDir=dist/public
├── android/                  # Capacitor が生成した Android プロジェクト
├── client/
│   ├── index.html
│   ├── public/icons/         # PWA アイコン（ルートの 1784369901054.png から生成）
│   └── src/
│       ├── domain/           # 計算・検証・タイムライン（UI 非依存）
│       ├── data/recipes/     # レシピ（1 ファイル 1 レシピ）+ index.ts
│       ├── stores/           # brew-store.tsx（Context + useReducer）
│       ├── hooks/            # use-brew-timer / use-wake-lock
│       ├── components/       # app-shell / recipe/ / brew/ / ui/（shadcn）
│       ├── lib/              # format / labels / storage / feedback
│       ├── pages/            # setup / preview / timer / not-found
│       └── tests/
└── README.md                 # 起動・テスト・デプロイ・レシピ追加手順
```

## テスト

`npm test` で全テストが走る。レシピを追加・変更したら必ず実行すること
（`recipe-data.test.ts` が全レシピを検証し、不正なデータがあれば落ちる）。

`legacy-parity.test.ts` は旧 `client/src/lib/brew-calculator.ts` から移植した 3 メソッド
（10:10 / カフェラテ / アイス）の数値を固定している。これらの計算を変えるときは意図的な変更かを確認する。

### テスト環境の注意

- `@testing-library/react` は擬似タイマーの有無を `global.jest` で判定するため、
  `client/src/tests/setup.ts` で最小限の橋渡しを入れている（これが無いと `asyncWrapper` がハングする）
- 擬似タイマーを使うテストでは `userEvent.setup({ delay: null })` を使い、`findBy*` ではなく `getBy*` を使う

## Android（Capacitor）構成と注意点

- 方式: 既存 Vite ビルド（`dist/public`）を **ネイティブ WebView で包む** Capacitor ラップ。
- **重要**: `client/` を変更したら必ず `npm run build:android`（= `vite build && cap sync android`）で
  Android 側へ同期すること。`cap sync` を忘れると WebView が古い画面のままになる。
- **Service Worker は Capacitor 実行時には登録しない**（`client/src/main.tsx` で判定）。
  ネイティブはアプリ更新で資産が差し替わるため、SW のキャッシュが古い画面を固定してしまうのを避ける。
- `android/` 配下のビルド生成物・`local.properties`・コピーされた web 資産は `android/.gitignore` で除外済み。
- **ビルド環境の制約**: APK の実ビルドには Android SDK / Google Maven（`dl.google.com`）への到達が必要。
  ネットワーク許可リストでブロックされる環境では `gradlew` ビルドが失敗する。

## 作業ブランチ

- 機能開発は指定された作業ブランチ上で行い、明示的な許可なく他ブランチへ push しない。
