import { useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrewStepList } from "@/components/brew/brew-step-list";
import { RecipeSummary } from "@/components/recipe/recipe-summary";
import { UnsupportedRangeWarning } from "@/components/recipe/unsupported-range-warning";
import { useBrewStore } from "@/stores/brew-store";
import { formatTime } from "@/lib/format";

export default function PreviewPage() {
  const [, navigate] = useLocation();
  const store = useBrewStore();
  const { computed } = store;

  // 直接この URL を開いた場合もプレビュー状態にそろえる
  useEffect(() => {
    if (store.session.status === "idle") store.openPreview();
  }, [store]);

  const hasStateSteps = computed.steps.some((s) => s.requiresConfirmation);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 min-h-[44px]"
          onClick={() => navigate("/")}
          data-testid="back-to-setup"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          設定に戻る
        </Button>
        <h1 className="text-xl font-semibold tracking-[-0.02em]">{computed.recipe.name}</h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          豆 {computed.doseG}g ／ 湯 {computed.totalWaterG}g ／ {computed.temperatureC}℃ ／
          抽出終了予定 {formatTime(computed.estimatedFinishSec)}
        </p>
      </header>

      <UnsupportedRangeWarning warnings={computed.warnings} />

      <RecipeSummary computed={computed} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">抽出手順（全 {computed.steps.length} ステップ）</h2>
        {hasStateSteps && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            「要確認」のステップは時間ではなく抽出の状態で進みます。タイマー画面で確認ボタンを押して進めてください。
          </p>
        )}
        <BrewStepList computed={computed} />
      </section>

      {/* 下端に固定する主要アクション。下をスクロールする内容はグラデーションで抜く */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-3 pt-8">
        <Button
          className="min-h-[56px] w-full text-base shadow-lg"
          onClick={() => {
            store.start();
            navigate("/timer");
          }}
          data-testid="start-timer"
        >
          <Timer className="h-5 w-5" aria-hidden />
          タイマーを開始
        </Button>
      </div>
    </div>
  );
}
