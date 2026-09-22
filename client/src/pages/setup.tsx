import { useLocation } from "wouter";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MethodSelector } from "@/components/recipe/method-selector";
import { DoseControl } from "@/components/recipe/dose-control";
import { RecipeControls } from "@/components/recipe/recipe-controls";
import { ArrangePanel } from "@/components/recipe/arrange-panel";
import { RecipeSummary } from "@/components/recipe/recipe-summary";
import { RecipeSourceDialog } from "@/components/recipe/recipe-source-dialog";
import { UnsupportedRangeWarning } from "@/components/recipe/unsupported-range-warning";
import { RestoreSessionDialog } from "@/components/brew/restore-session-dialog";
import { useBrewStore } from "@/stores/brew-store";
import { primeAudio } from "@/lib/feedback";

export default function SetupPage() {
  const [, navigate] = useLocation();
  const store = useBrewStore();
  const { computed } = store;

  return (
    <div className="space-y-4">
      <RestoreSessionDialog onRestore={() => navigate("/timer")} />

      <header>
        <h1 className="text-xl font-semibold tracking-[-0.02em]">ドリップを組み立てる</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          レシピと豆量を選ぶと、注湯手順が自動で計算されます。
        </p>
      </header>

      <MethodSelector
        selectedId={computed.recipe.id}
        favorites={store.prefs.favorites}
        onSelect={store.selectRecipe}
        onToggleFavorite={store.toggleFavorite}
      />

      <DoseControl computed={computed} onChange={store.setDose} />

      <UnsupportedRangeWarning warnings={computed.warnings} />

      <RecipeControls computed={computed} onChange={store.setControl} />

      <ArrangePanel
        computed={computed}
        mode={store.mode}
        arrangement={store.arrangement}
        onModeChange={store.setMode}
        onArrange={store.setArrangement}
        onReset={store.resetArrangement}
      />

      <RecipeSummary computed={computed} />

      <RecipeSourceDialog computed={computed} />

      {/* 下端に固定する主要アクション。下をスクロールする内容はグラデーションで抜く */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-3 pt-8">
        <Button
          className="min-h-[56px] w-full text-base shadow-lg"
          onClick={() => {
            // iOS では最初のユーザー操作でしか AudioContext を起こせない
            primeAudio();
            store.openPreview();
            navigate("/preview");
          }}
          data-testid="start-brew"
        >
          <Play className="h-5 w-5" aria-hidden />
          抽出を開始
        </Button>
      </div>
    </div>
  );
}
