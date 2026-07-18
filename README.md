# brew_cofee_46method

[粕谷哲（Tetsu Kasuya）氏](https://www.youtube.com/@tetsukasuya)が World Brewers Cup 2016 で優勝した **4:6 メソッド**を、豆の量・味の方向性・濃度から自動でレシピ化するコーヒー抽出計算機の Web アプリです。フロントは **Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui** の SPA（ハッシュルーティング）。豆量を入れるだけで「何投目に何 g 注ぐか」「累計湯量」「目安タイム」までを即座に表示します。

## できること

- **豆量の指定** — スライダー / 数値入力（10〜40 g、入力は 1〜60 g まで）。湯量（豆量 ×15）と比率を自動計算
- **味の方向性の選択** — 甘め（1 投目 40%）/ バランス（50%）/ 明るめ（1 投目 60%）
- **濃度の選択** — 軽め（後半 2 投）/ 標準（後半 3 投）/ 濃いめ（後半 4 投）
- **ドリップ手順の自動生成** — 各投の注湯量・開始タイム・目的・累計湯量・合計投数・目安抽出時間をタイムライン表示
- **ライト / ダークテーマ**の切り替え
- **抽出ログ**（任意・フルスタック構成のみ） — 豆名・産地・焙煎度・評価・メモ付きで記録を保存 / 一覧 / 削除（後述）

## 前提条件

- Node.js（推奨 v20+）
- 依存関係のインストール

  ```bash
  npm install
  ```

## アーキテクチャ

- **計算ロジック**: `client/src/lib/brew-calculator.ts` の `calculateRecipe(coffeeGrams, flavorBalance, strengthLevel)`。UI から独立した純粋関数で、総湯量（豆量 ×15）→ 前半 40% を 2 投に分割 → 後半 60% を均等割り → 各投に 45 秒間隔の開始タイム・累計湯量・目安抽出時間を付与し、`BrewRecipe` を返す。味 / 濃度の選択肢定義（`FLAVOR_BALANCES` / `STRENGTH_LEVELS` / `ROAST_LEVELS`）も同ファイルに集約。
- **画面**: `client/src/pages/calculator.tsx`（豆量スライダー・味 / 濃度の選択・手順タイムライン）。状態は `useState` + `useMemo` で保持し、入力が変わるたびに再計算するだけのシンプルな構成。
- **ルーティング**: `client/src/App.tsx` が `wouter` の**ハッシュルーティング**（`useHashLocation`）で `/` を計算機に割り当て。`base: "./"`（相対パス）でビルドするため、サブパス配信でも動く。
- **レイアウト / テーマ**: `client/src/components/layout.tsx`（ヘッダー + ナビ + テーマ切替）、`theme-provider.tsx`（ライト / ダーク）。
- **UI 部品**: `client/src/components/ui/`（shadcn/ui = Radix UI ベース）。アイコンは lucide-react、スタイルは Tailwind CSS。
- **データ取得**: `client/src/lib/queryClient.ts`（TanStack Query）。抽出ログ画面の API 呼び出しに使用。
- **バックエンド（任意 / フルスタック構成）**: `server/index.ts`（Express 5。開発時は Vite ミドルウェア、本番は `dist/public` を静的配信）、`server/routes.ts`（`/api/brew-logs` の CRUD）、`server/storage.ts`（`better-sqlite3` + Drizzle ORM、`data.db` に WAL モードで保存）。
- **共有スキーマ**: `shared/schema.ts`（Drizzle の `brew_logs` テーブル定義 + `drizzle-zod` による Zod バリデーション）。クライアント / サーバー双方が型を共有。

### 主要ファイル

```
brew_cofee_46method/
├── package.json
├── vite.config.ts          # root=client / base="./" / 出力 dist/public
├── tailwind.config.ts / postcss.config.js / components.json
├── drizzle.config.ts       # SQLite (data.db) 向け drizzle-kit 設定
├── render.yaml             # Render 静的サイトのデプロイ設定
├── script/
│   └── build.ts            # クライアント(vite) + サーバー(esbuild) 一括ビルド
├── client/                 # フロントエンド（Vite root）
│   ├── index.html
│   └── src/
│       ├── main.tsx                    # エントリポイント
│       ├── App.tsx                     # ルーティング（/ = 計算機）
│       ├── lib/
│       │   ├── brew-calculator.ts      # 4:6 計算ロジック（中核）
│       │   ├── queryClient.ts          # TanStack Query
│       │   └── utils.ts
│       ├── pages/
│       │   ├── calculator.tsx          # 計算機画面
│       │   ├── logs.tsx                # 抽出ログ画面（フルスタック構成のみ）
│       │   └── not-found.tsx
│       ├── components/
│       │   ├── layout.tsx              # ヘッダー / ナビ / テーマ切替
│       │   ├── theme-provider.tsx      # ライト / ダーク
│       │   └── ui/                     # shadcn/ui（Radix ベース）
│       └── hooks/                      # use-mobile / use-toast
├── server/                 # Express API（任意のフルスタック構成）
│   ├── index.ts            # エントリ（dev=Vite / prod=静的配信）
│   ├── routes.ts           # /api/brew-logs の CRUD
│   ├── storage.ts          # better-sqlite3 + Drizzle
│   ├── static.ts           # 本番の静的配信
│   └── vite.ts             # 開発時の Vite ミドルウェア
└── shared/
    └── schema.ts           # Drizzle スキーマ + Zod バリデーション
```

## 実行方法

### 静的サイトとして使う（推奨・デプロイと同構成）

計算機のみを含む完全クライアントサイドのビルドです。サーバーや DB は不要です。

```bash
npm install
npm run build:static     # → dist/public/
```

`dist/public/` を任意の静的ホスティングに置けば動作します（`base: "./"` のためサブパス配信も可）。

### フルスタック構成で開発する（抽出ログ機能込み）

Express + SQLite を起動し、抽出ログの保存 / 一覧 / 削除 API を有効にします。

```bash
npm run dev      # tsx で server/index.ts を起動（既定 http://localhost:5000 ）
npm run db:push  # 初回のみ: Drizzle スキーマを data.db に反映
```

本番相当の確認をする場合:

```bash
npm run build    # クライアント + サーバーを一括ビルド
npm run start    # dist/index.cjs を本番モードで起動
```

## Android アプリ（Capacitor）

同じ Web アプリを [Capacitor](https://capacitorjs.com/) で **Android アプリ（APK / AAB）**化できます。既存の Vite ビルド成果物（`dist/public`）をネイティブ WebView で包む方式のため、`client/` 配下の React コード・計算ロジックはそのまま再利用され、UI の書き直しは不要です。Android プロジェクトは `android/`（`cap add android` で生成済み）にあります。

```bash
npm install
npm run build:android   # vite build → cap sync android
npm run open:android    # Android Studio で開いて Build ▸ Build APK
```

- 初期設定: appId `com.tabear25.brew46` / appName `Coffee 4:6`（`capacitor.config.ts`）
- **必要な前提ツール（Android Studio / SDK / JDK）、デバッグ・署名 APK のビルド手順、トラブルシューティングは [ANDROID.md](ANDROID.md) にまとめてあります。**
- Web 側（`client/`）を変更したら、`npm run build:android` で再同期してから Android をビルドしてください。

## デプロイ（Render）

`render.yaml` により [Render](https://render.com/) の **静的サイト**としてデプロイされます（計算機のみ）。

```yaml
buildCommand: npm install && npx vite build
staticPublishPath: ./dist/public
```

- `NPM_CONFIG_PRODUCTION=false` を指定し、devDependencies（Vite など）も含めてインストールしたうえでビルドします。
- 抽出ログを含むフルスタック構成（Express + SQLite）は、Render の静的サイトではなく Web Service など別のランタイムが必要です。

## 動かなかったら

### 1. `npm` コマンドが見つからない / Node が無い

システム Node が未導入の場合、ポータブル Node を PATH に前置きしてください（「前提条件」参照）。日常運用では公式 Node の導入を推奨します。

### 2. `npm run dev` / `npm run start` が PowerShell でエラーになる

これらのスクリプトは `NODE_ENV=...` を前置きする POSIX 形式で、Windows の標準シェルでは解釈できません。`cross-env` を挟むか、`$env:NODE_ENV` を設定してから実行してください。計算機だけなら環境変数に依存しない `npm run build:static` で十分です。

### 3. 抽出ログ画面が表示されない / `/api/brew-logs` が 404 になる

抽出ログは **フルスタック構成（`npm run dev` / `npm run start`）でのみ**動作します。静的ビルド（`build:static` / Render デプロイ）には計算機しか含まれません。ログ機能を使うには Express サーバーと `data.db`（`npm run db:push` で初期化）が必要です。

### 4. `npm install` で better-sqlite3 のビルドに失敗する

`better-sqlite3` はネイティブモジュールで、インストール時にビルドツール（Windows なら Visual Studio Build Tools / Python など）が必要です。計算機のみを使う場合はビルドが通らなくても `build:static` は動きますが、フルスタック構成を使うにはビルド環境を整えてください。