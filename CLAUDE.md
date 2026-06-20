# CLAUDE.md

このファイルは Claude Code（claude.ai/code）が本リポジトリで作業する際のガイドです。

## プロジェクト概要

粕谷哲（Tetsu Kasuya）氏が World Brewers Cup 2016 で優勝した **4:6 メソッド**を、豆の量・味の方向性・濃度から
自動でレシピ化するコーヒー抽出計算機。フロントは **Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui** の
SPA（ハッシュルーティング）。豆量を入れるだけで「何投目に何 g 注ぐか」「累計湯量」「目安タイム」を即時表示する。

- 4:6 メソッド: 総湯量を前半 40%（味）／後半 60%（濃度）に分けて注ぐ。粉:湯 = **1:15** 固定、注湯間隔 **45 秒**。
- 計算ロジックの中核は [`client/src/lib/brew-calculator.ts`](client/src/lib/brew-calculator.ts) の純粋関数 `calculateRecipe`。
- ディレクトリ名は歴史的経緯で `brew_cofee_46method`（`coffee` ではなく `cofee`）。

## 技術スタック

- **フロント**: React 18 / TypeScript 5.6 / Vite 7 / Tailwind CSS 3 / shadcn/ui（Radix UI）/ wouter（ハッシュルーティング）
- **状態**: React Hooks（`useState` + `useMemo`）のみ。重い状態管理ライブラリは不使用
- **アイコン**: lucide-react / **テーマ**: next-themes（ライト・ダーク）
- **バックエンド（任意）**: Express 5 + better-sqlite3 + Drizzle ORM（抽出ログ機能。静的デプロイには含まれない）
- **モバイル**: Capacitor 8（`android/` に Android プロジェクト）

## 開発コマンド

| コマンド | 用途 |
| --- | --- |
| `npm install` | 依存インストール |
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | Web ビルド（`vite build` → `dist/public/`） |
| `npm run check` | 型チェック（`tsc`） |
| `npm run build:android` | Android 向けビルド（`vite build` → `cap sync android`） |
| `npm run open:android` | Android Studio で `android/` を開く |

> ⚠️ package.json の実スクリプトは `dev` / `build` / `preview` / `check` / `build:android` / `open:android`。
> README には `build:static` / `start` / `db:push` 等のフルスタック前提の記述があるが、現状の package.json には
> 含まれていない（フルスタック構成を使う場合は別途スクリプト整備が必要）。

## アーキテクチャ

- **計算ロジック**: `client/src/lib/brew-calculator.ts` の `calculateRecipe(coffeeGrams, flavorBalance, strengthLevel)`。
  UI から独立した純粋関数。総湯量（豆量 ×15）→ 前半 40% を 2 投に分割 → 後半 60% を均等割り →
  各投に 45 秒間隔の開始タイム・累計湯量・目安抽出時間を付与し `BrewRecipe` を返す。
  選択肢定義（`FLAVOR_BALANCES` / `STRENGTH_LEVELS` / `ROAST_LEVELS`）も同ファイル。
- **画面**: `client/src/pages/calculator.tsx`（豆量スライダー・味/濃度選択・手順タイムライン）。入力変更で再計算するだけ。
- **ルーティング**: `client/src/App.tsx`（wouter のハッシュルーティング）。`base: "./"` 相対パスでサブパス配信に対応。
- **レイアウト/テーマ**: `client/src/components/layout.tsx` / `theme-provider.tsx`。UI 部品は `client/src/components/ui/`（shadcn/ui）。
- **ビルド設定**: `vite.config.ts`（root=`client` / `base="./"` / 出力 `dist/public`）。

## ディレクトリ構成（抜粋）

```
brew_cofee_46method/
├── capacitor.config.ts   # Capacitor 設定（appId / appName / webDir=dist/public）
├── android/              # Capacitor が生成した Android プロジェクト（Capacitor 管理）
├── vite.config.ts        # root=client / base="./" / 出力 dist/public
├── client/               # フロントエンド（Vite root）
│   └── src/
│       ├── lib/brew-calculator.ts   # 4:6 計算ロジック（中核・UI 非依存）
│       ├── pages/calculator.tsx     # 計算機画面
│       ├── App.tsx                  # ルーティング
│       └── components/ui/           # shadcn/ui
├── server/               # Express API（任意のフルスタック構成）
└── shared/schema.ts      # Drizzle スキーマ + Zod
```

## Android（Capacitor）構成と注意点

- 方式: 既存 Vite ビルド（`dist/public`）を **ネイティブ WebView で包む** Capacitor ラップ。React/計算ロジックは無変更。
- 設定ファイル: `capacitor.config.ts`（`appId: com.tabear25.brew46` / `appName: Coffee 4:6` / `webDir: dist/public`）。
- **重要**: `client/` の Web 側を変更したら、必ず `npm run build:android`（= `vite build && cap sync android`）で
  Android 側へ同期すること。`cap sync` を忘れると WebView が古い画面のままになる。
- `android/` 配下のビルド生成物・`local.properties`・コピーされた web 資産は `android/.gitignore` で除外済み
  （プロジェクト構成自体はコミットする）。
- **ビルド環境の制約**: APK の実ビルドには Android SDK / Google Maven（`dl.google.com`）への到達が必要。
  ネットワーク許可リストでブロックされる環境（一部のクラウド実行環境を含む）では `gradlew` ビルドが失敗する。
  手元での APK ビルド手順・前提ツールは [ANDROID.md](ANDROID.md) を参照。

## 作業ブランチ

- 機能開発は指定された作業ブランチ上で行い、明示的な許可なく他ブランチへ push しない。
