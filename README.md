# brew_coffee_46method

[粕谷哲（Tetsu Kasuya）氏](https://www.youtube.com/@tetsukasuya)が World Brewers Cup 2016 で優勝した **4:6 メソッド**を、豆の量・味の方向性・濃度から自動でレシピ化するコーヒー抽出計算機の Web アプリです。フロントは **Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui** の SPA（ハッシュルーティング）。豆量を入れるだけで「何投目に何 g 注ぐか」「累計湯量」「目安タイム」までを即座に表示します。

> ☕ **4:6 メソッドとは**: 総湯量を **前半 40%（味）** と **後半 60%（濃度）** に分けて注ぐ抽出法です。前半は 2 投に分け、1 投目を少なくすると甘め・多くすると明るめ（酸味）に寄ります。後半は注ぐ回数で濃さを調整します（少=軽め / 多=濃いめ）。このアプリは粉と湯の比率を **1:15** に固定し、注湯間隔を **45 秒** として手順を組み立てます。計算ロジックの本体は [`client/src/lib/brew-calculator.ts`](client/src/lib/brew-calculator.ts) の純粋関数 `calculateRecipe` です。

> 📝 GitHub リポジトリ名は `brew_coffee_46method` です（過去のドキュメントやパスでは `cofee` 表記が残っていることがあります）。

## できること

- **豆量の指定** — スライダー / 数値入力（10〜40 g、入力は 1〜60 g まで）。湯量（豆量 ×15）と比率を自動計算
- **味の方向性の選択** — 甘め（1 投目 40%）/ バランス（50%）/ 明るめ（1 投目 60%）
- **濃度の選択** — 軽め（後半 2 投）/ 標準（後半 3 投）/ 濃いめ（後半 4 投）
- **ドリップ手順の自動生成** — 各投の注湯量・開始タイム・目的・累計湯量・合計投数・目安抽出時間をタイムライン表示
- **ライト / ダークテーマ**の切り替え

> ℹ️ 本アプリは**完全クライアントサイドの SPA（計算機のみ）**です。サーバーやデータベースは不要で、`App.tsx` のルーターは `/` の計算機のみを登録しています。

## コマンド

package.json に定義されている実スクリプトは以下のとおりです。

| コマンド | 用途 |
| --- | --- |
| `npm install` | 依存関係のインストール |
| `npm run dev` | Vite 開発サーバ起動（既定 http://localhost:5173 ） |
| `npm run build` | 本番ビルド（`vite build` → `dist/public/`）。サーバー / DB 不要 |
| `npm run preview` | ビルド成果物（`dist/public/`）のローカルプレビュー |
| `npm run check` | 型チェック（`tsc`） |
| `npm run build:android` | **Android 向けビルド**（`vite build` → `cap sync android`）。詳細は [ANDROID.md](ANDROID.md) |
| `npm run open:android` | Android Studio で `android/` プロジェクトを開く（`cap open android`） |

## 前提条件

- Node.js（推奨 v20 以上。Capacitor CLI 8 を使う `build:android` には **Node 22 以上**が必要）
- 依存関係のインストール

  ```bash
  npm install
  ```

## アーキテクチャ

- **計算ロジック**: `client/src/lib/brew-calculator.ts` の `calculateRecipe(coffeeGrams, flavorBalance, strengthLevel)`。UI から独立した純粋関数で、総湯量（豆量 ×15）→ 前半 40% を 2 投に分割 → 後半 60% を均等割り → 各投に 45 秒間隔の開始タイム・累計湯量・目安抽出時間を付与し、`BrewRecipe` を返す。味 / 濃度の選択肢定義（`FLAVOR_BALANCES` / `STRENGTH_LEVELS` / `ROAST_LEVELS`）も同ファイルに集約。
- **画面**: `client/src/pages/calculator.tsx`（豆量スライダー・味 / 濃度の選択・手順タイムライン）。状態は `useState` + `useMemo` で保持し、入力が変わるたびに再計算するだけのシンプルな構成。
- **ルーティング**: `client/src/App.tsx` が `wouter` の**ハッシュルーティング**（`useHashLocation`）で `/` を計算機に割り当て。`base: "./"`（相対パス）でビルドするため、サブパス配信でも動く。
- **レイアウト / テーマ**: `client/src/components/layout.tsx`（ヘッダー + ナビ + テーマ切替）、`theme-provider.tsx`（ライト / ダーク、`next-themes`）。
- **UI 部品**: `client/src/components/ui/`（shadcn/ui = Radix UI ベース）。アイコンは lucide-react、スタイルは Tailwind CSS。
- **アプリシェル**: `client/src/lib/queryClient.ts`（TanStack Query の `QueryClientProvider`）でアプリ全体を包む。現状の計算機は API 通信を行わないが、プロバイダはアプリの土台として組み込まれている。

### 主要ファイル

```
brew_coffee_46method/
├── package.json
├── vite.config.ts          # root=client / base="./" / 出力 dist/public
├── tailwind.config.ts / postcss.config.js / components.json
├── capacitor.config.ts     # Capacitor 設定（appId / appName / webDir=dist/public）
├── render.yaml             # Render 静的サイトのデプロイ設定
├── ANDROID.md              # Android（Capacitor）ビルド手順
├── .github/
│   └── workflows/
│       └── android-apk.yml # APK を自動ビルドして Artifact / Release に配布
├── android/                # Capacitor Android プロジェクト（cap add android で生成済み）
└── client/                 # フロントエンド（Vite root）
    ├── index.html
    └── src/
        ├── main.tsx                    # エントリポイント
        ├── App.tsx                     # ルーティング（/ = 計算機）
        ├── lib/
        │   ├── brew-calculator.ts      # 4:6 計算ロジック（中核）
        │   ├── queryClient.ts          # TanStack Query（アプリシェル）
        │   └── utils.ts
        ├── pages/
        │   ├── calculator.tsx          # 計算機画面
        │   └── not-found.tsx
        ├── components/
        │   ├── layout.tsx              # ヘッダー / ナビ / テーマ切替
        │   ├── theme-provider.tsx      # ライト / ダーク
        │   └── ui/                     # shadcn/ui（Radix ベース）
        └── hooks/                      # use-mobile / use-toast
```

## 実行方法

### 開発サーバ

```bash
npm install
npm run dev      # http://localhost:5173
```

### 本番ビルド（デプロイと同構成）

完全クライアントサイドのビルドです。サーバーや DB は不要です。

```bash
npm install
npm run build    # → dist/public/
npm run preview  # ローカルでビルド結果を確認（任意）
```

`dist/public/` を任意の静的ホスティングに置けば動作します（`base: "./"` のためサブパス配信も可）。

## Android アプリ（Capacitor）

同じ Web アプリを [Capacitor](https://capacitorjs.com/) で **Android アプリ（APK / AAB）**化できます。既存の Vite ビルド成果物（`dist/public`）をネイティブ WebView で包む方式のため、`client/` 配下の React コード・計算ロジックはそのまま再利用され、UI の書き直しは不要です。Android プロジェクトは `android/`（`cap add android` で生成済み）にあります。

```bash
npm install
npm run build:android   # vite build → cap sync android
npm run open:android    # Android Studio で開いて Build ▸ Build APK
```

- 初期設定: appId `com.tabear25.brew46` / appName `Coffee 4:6`（`capacitor.config.ts`）
- **必要な前提ツール（Android Studio / SDK / JDK 21）、デバッグ・署名 APK のビルド手順、トラブルシューティングは [ANDROID.md](ANDROID.md) にまとめてあります。**
- Web 側（`client/`）を変更したら、`npm run build:android` で再同期してから Android をビルドしてください。

### GitHub Actions で APK を自動ビルドしてダウンロード

Android Studio を用意しなくても、GitHub 上で APK をビルドして直接ダウンロードできます。ワークフロー定義は [`.github/workflows/android-apk.yml`](.github/workflows/android-apk.yml) です。

- `main` / `claude/**` ブランチへの push、または **Actions** タブからの手動実行（Run workflow）でビルドが走ります。
- 実行が成功すると、その run の下部 **Artifacts** に `coffee-46-debug-apk`（ZIP）が生成されます。展開すると `app-debug.apk` が入っています。
- `v` で始まるタグ（例 `v1.0`）を push すると、APK が **GitHub Release** にも自動添付されます。
- ランナーは Node 22 / JDK 21 / Android SDK を用意し、`npm run build:android` → `gradlew assembleDebug` で**デバッグ署名の APK**を生成します（個人利用・動作確認向け）。Google Play 配布用の署名付き AAB は [ANDROID.md](ANDROID.md) のセクション 4 を参照してください。

## デプロイ（Render）

`render.yaml` により [Render](https://render.com/) の **静的サイト**としてデプロイされます。

```yaml
buildCommand: npm install && npx vite build
staticPublishPath: ./dist/public
```

- `NPM_CONFIG_PRODUCTION=false` を指定し、devDependencies（Vite など）も含めてインストールしたうえでビルドします。

## 動かなかったら

### `npm` コマンドが見つからない / Node が無い

公式 Node.js（推奨 v20 以上）を導入してください。`build:android`（Capacitor CLI 8）を使う場合は **Node 22 以上**が必要です。

### `npm run build:android` が `The Capacitor CLI requires NodeJS >=22.0.0` で失敗する

Capacitor CLI 8 は Node 22 以上を要求します。Node を 22 以上に更新してください。

### Android のビルドが `invalid source release: 21` で失敗する

Capacitor 8 の Android ライブラリは Java 21 でコンパイルされます。**JDK 21** を使ってください（詳細は [ANDROID.md](ANDROID.md)）。
