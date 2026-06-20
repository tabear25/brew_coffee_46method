# Android アプリ化ガイド（Capacitor）

このドキュメントは、本プロジェクト（Coffee 4:6 ドリップ計算機）を **Android アプリ（APK / AAB）**
としてビルド・配布するために、**手元の PC で必要となる対応**を 1 つにまとめたものです。

本リポジトリには [Capacitor](https://capacitorjs.com/) による Android プロジェクト（`android/`）が
すでに組み込まれています。React/Vite で作られた既存の Web アプリを **ネイティブ WebView で包む**方式のため、
アプリのロジックや UI（`client/` 配下）はそのまま再利用されます。

> ⚠️ **クラウド実行環境（Claude Code on the web）の既定設定ではビルドできません。**
> 既定の **Trusted** ネットワークポリシーには Android SDK 本体や Google Maven リポジトリ
> （`dl.google.com` / `maven.google.com`）が含まれず、ブロックされます。そのため既定のままだと
> `gradlew assembleDebug` 等の実ビルドは失敗します。
> **手元の PC（Android Studio）でビルドする場合は §1〜§2 を、クラウド環境でビルドしたい場合は
> [§7 クラウド実行環境でビルドする](#7-クラウド実行環境claude-code-on-the-webでビルドする) を参照してください。**

---

## 1. 前提ツールのインストール

| ツール | バージョン目安 | 用途 |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18 以上 | Web ビルド・Capacitor CLI |
| [Android Studio](https://developer.android.com/studio) | 最新安定版 | Android ビルド・エミュレータ・SDK 管理 |
| Android SDK Platform | **API 34 以上** | コンパイル対象 |
| Android SDK Build-Tools | 最新 | APK ビルド |
| Android SDK Platform-Tools | 最新 | `adb`（実機転送） |
| JDK | **17 以上** | Gradle 実行（Android Studio 同梱の JBR で可） |

### SDK のセットアップ手順
1. Android Studio を起動 → **More Actions ▸ SDK Manager**（または Settings ▸ Languages & Frameworks ▸ Android SDK）。
2. **SDK Platforms** タブで「Android 14 (API 34)」以上にチェックを入れインストール。
3. **SDK Tools** タブで「Android SDK Build-Tools」「Android SDK Platform-Tools」「Android SDK Command-line Tools」を導入。
4. 必要に応じてライセンスに同意（CLI なら `sdkmanager --licenses`）。
5. 環境変数を設定（任意だが推奨）:
   - macOS/Linux: `export ANDROID_HOME=$HOME/Android/Sdk`（`PATH` に `$ANDROID_HOME/platform-tools` を追加）
   - Windows: `ANDROID_HOME = %LOCALAPPDATA%\Android\Sdk`
6. コマンドラインで Gradle ビルドする場合は、`android/local.properties` に SDK パスを記載:
   ```properties
   sdk.dir=/Users/you/Library/Android/sdk      # 例（macOS）
   # sdk.dir=C\:\\Users\\you\\AppData\\Local\\Android\\Sdk   # 例（Windows）
   ```
   ※ `local.properties` は `.gitignore` 済み（コミット不要）。Android Studio で開けば自動生成されます。

---

## 2. デバッグ APK のビルド

リポジトリのルートで以下を実行します。

```bash
# 1. 依存をインストール
npm install

# 2. Web をビルドして Android プロジェクトへ同期
npm run build:android        # = vite build && cap sync android

# 3a. Android Studio で開いてビルド（推奨）
npm run open:android         # = cap open android
#   → Android Studio で「Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)」

# 3b. または CLI で直接ビルド
cd android
./gradlew assembleDebug      # Windows: gradlew.bat assembleDebug
```

生成物（デバッグ APK）:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

> Web 側（`client/`）を変更したら、必ず `npm run build:android`（= `vite build && cap sync android`）を
> 再実行してから Android をビルドしてください。`cap sync` を忘れると古い画面のままになります。

---

## 3. 実機 / エミュレータで動作確認

- **エミュレータ**: Android Studio の **Device Manager** で AVD（API 34 等）を作成し起動 → ▶ Run。
- **実機**: 端末で「開発者向けオプション ▸ USB デバッグ」を有効化し USB 接続 → 次でインストール:
  ```bash
  adb install android/app/build/outputs/apk/debug/app-debug.apk
  ```

起動後、スライダーで豆の量を変え、味わい・濃さを選ぶと抽出レシピ（注湯ステップ・時間）が
表示されれば成功です。

---

## 4. リリース用（署名付き）APK / AAB の作成

Google Play で配布するには署名済みの **AAB（Android App Bundle）** が必要です。

1. **キーストアを作成**（一度だけ。紛失するとアプリ更新ができなくなるため厳重に保管）:
   ```bash
   keytool -genkey -v -keystore brew46-release.keystore \
     -alias brew46 -keyalg RSA -keysize 2048 -validity 10000
   ```
2. `android/app/build.gradle` に署名設定を追加（パスワードは `keystore.properties` 等に外出しを推奨）:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file("../../brew46-release.keystore")
               storePassword "***"
               keyAlias "brew46"
               keyPassword "***"
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled false
           }
       }
   }
   ```
3. ビルド:
   ```bash
   cd android
   ./gradlew bundleRelease      # AAB（Play 配布用）→ app/build/outputs/bundle/release/app-release.aab
   ./gradlew assembleRelease    # APK（直接配布用）→ app/build/outputs/apk/release/app-release.apk
   ```
4. [Google Play Console](https://play.google.com/console) でアプリを作成し、AAB をアップロード。
   （ストアリスティング、プライバシーポリシー、スクリーンショット等の準備が別途必要）

---

## 5. アプリのカスタマイズ

| 変更したいもの | 場所 |
|---|---|
| アプリ表示名 | `android/app/src/main/res/values/strings.xml` の `app_name` |
| パッケージ名（appId） | `capacitor.config.ts` の `appId` ＋ `android/app/build.gradle` の `applicationId`/`namespace`（※公開後は変更不可） |
| バージョン | `android/app/build.gradle` の `versionCode`（整数, 毎リリース +1）/ `versionName`（表示用 "1.0" 等） |
| アプリアイコン | Android Studio の **Image Asset Studio**（res ▸ 右クリック ▸ New ▸ Image Asset） |
| スプラッシュ/テーマ | `android/app/src/main/res/` 配下 |

現在の初期値:
- appId: `com.tabear25.brew46`
- appName: `Coffee 4:6`
- versionCode: `1` / versionName: `1.0`

---

## 6. トラブルシューティング

| 症状 | 対処 |
|---|---|
| `SDK location not found` | `android/local.properties` の `sdk.dir`、または `ANDROID_HOME` を設定 |
| ライセンス未同意エラー | `sdkmanager --licenses` で同意 |
| 画面が古い/真っ白 | `npm run build:android` で再ビルド＆同期したか確認 |
| Gradle / AGP のバージョン不一致 | Android Studio を最新化、`android/build.gradle` の AGP と Gradle wrapper を更新 |
| 依存ダウンロードに失敗 | ネットワークが `dl.google.com`（Google Maven）へ到達できるか確認（社内プロキシ等に注意） |

---

## 7. クラウド実行環境（Claude Code on the web）でビルドする

手元の PC ではなく、クラウド実行環境（claude.ai/code）で APK を生成したい場合は、
**ネットワーク許可リスト（allowlist）に Android ビルド用ドメインを追加**する必要があります。
既定の **Trusted** ポリシーには以下が含まれておらず、追加しないとビルドが失敗します。

### 追加するドメイン

| ドメイン | 用途 | 重要度 |
|---|---|---|
| `dl.google.com` | **Android SDK 本体 ＋ Google Maven（AGP / AndroidX）の配布元** | **必須** |
| `maven.google.com` | Google Maven のエイリアス | 推奨（保険） |
| `*.gradle.org` | Gradle 配布・Gradle プラグインポータル | 推奨（保険） |

> `repo1.maven.org`（Maven Central）と `services.gradle.org`（Gradle 配布）は既定の Trusted で到達可能。
> 事実上の唯一のブロッカーは **`dl.google.com`** です。

### 許可リストの編集手順（環境設定 ＝ Web の操作）

allowlist は**環境（Environment）のネットワークポリシー**設定で、コンテナ内からは変更できません。

1. **claude.ai/code** で対象の環境を開いて編集（クラウドアイコン → 環境を編集）
2. ダイアログの **Network access** セレクタで **Custom** を選択
3. 現れた **Allowed domains** 欄に上記ドメインを 1 行ずつ入力
4. **「Also include default list of common package managers」にチェック**
   （npm / GitHub 等の既定許可を残すため。外すと既存の到達先まで失われる）
5. 保存

> - 変更が**実行中のコンテナへ即時反映されるとは限らない**（新しいセッション / 再起動で適用される場合がある）。
>   反映後に `curl -I https://dl.google.com/...` 等で到達を確認してからビルドすること。
> - `Full`（全ドメイン許可）でも可能だが、セキュリティ上は上記の **Custom + 限定ドメイン**を推奨。
> - 詳細: [Claude Code on the web — Network access](https://code.claude.com/docs/en/claude-code-on-the-web#network-access)

### 反映後のビルド手順（SDK が未導入のクリーン環境）

クラウド環境には Android SDK が無いため、command-line tools から導入する。

```bash
# 1. Android command-line tools を取得・展開（dl.google.com 到達が前提）
export ANDROID_HOME="$HOME/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"
curl -fsSL -o /tmp/cmdtools.zip \
  https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q /tmp/cmdtools.zip -d "$ANDROID_HOME/cmdline-tools"
mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# 2. 必要コンポーネントの導入＋ライセンス同意
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# 3. Web をビルドして Android へ同期 → APK ビルド
npm install
npm run build:android        # vite build && cap sync android
cd android && ./gradlew assembleDebug
#   → android/app/build/outputs/apk/debug/app-debug.apk
```

> JDK は環境に含まれる JDK 17+ を使用（このリポジトリの検証環境では JDK 21 / Gradle 8.14 を確認済み）。
> `ANDROID_HOME` を設定していれば `android/local.properties` は不要（設定する場合は `sdk.dir` を記載）。

---

## 参考リンク
- Capacitor Android: https://capacitorjs.com/docs/android
- Capacitor Workflow: https://capacitorjs.com/docs/basics/workflow
- Android 公式（アプリ署名）: https://developer.android.com/studio/publish/app-signing
- Claude Code on the web（Network access）: https://code.claude.com/docs/en/claude-code-on-the-web#network-access
