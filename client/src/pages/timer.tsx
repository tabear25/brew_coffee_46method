import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Eye, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrewTimer } from "@/components/brew/brew-timer";
import { BrewStepList } from "@/components/brew/brew-step-list";
import { ManualConditionPrompt } from "@/components/brew/manual-condition-prompt";
import { ProgressIndicator } from "@/components/brew/progress-indicator";
import { TimerControls } from "@/components/brew/timer-controls";
import { useBrewTimer } from "@/hooks/use-brew-timer";
import { useBrewStore } from "@/stores/brew-store";
import { formatGrams } from "@/lib/format";

export default function TimerPage() {
  const [, navigate] = useLocation();
  const store = useBrewStore();
  const timer = useBrewTimer();
  const { computed, session } = store;

  // 抽出が始まっていない状態で直接開かれたら設定画面へ戻す
  useEffect(() => {
    if (store.hydrated && session.status === "idle") navigate("/");
  }, [store.hydrated, session.status, navigate]);

  // キーボードショートカット（一覧は設定ダイアログに掲載）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      switch (event.key) {
        case " ":
          event.preventDefault();
          if (timer.isPaused) store.resume();
          else store.pause();
          break;
        case "ArrowRight":
        case "n":
          event.preventDefault();
          timer.next();
          break;
        case "ArrowLeft":
        case "p":
          event.preventDefault();
          timer.previous();
          break;
        case "Enter":
          if (timer.awaitingConfirmation) {
            event.preventDefault();
            timer.confirmNext();
          }
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [timer, store]);

  if (timer.isCompleted) {
    return (
      <div className="space-y-5">
        <section className="rounded-xl border border-primary bg-primary/10 p-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h1 className="mt-2 text-xl font-semibold">抽出完了</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {computed.recipe.name} ／ 豆 {computed.doseG}g ／ 湯 {formatGrams(computed.totalWaterG)}
            g
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            総抽出時間は診断値です。最終判断は味で行ってください。
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="min-h-[52px]"
            onClick={() => {
              store.reset();
              navigate("/");
            }}
            data-testid="back-to-setup-from-complete"
          >
            設定に戻る
          </Button>
          <Button
            className="min-h-[52px]"
            onClick={() => {
              store.start();
            }}
            data-testid="brew-again"
          >
            もう一度淹れる
          </Button>
        </div>

        <BrewStepList computed={computed} compact />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProgressIndicator
        ratio={timer.progressRatio}
        currentStepNumber={timer.currentStep.step.order}
        totalSteps={computed.steps.length}
        elapsedSec={timer.elapsedSec}
        estimatedFinishSec={computed.estimatedFinishSec}
      />

      <BrewTimer
        computed={computed}
        currentStep={timer.currentStep}
        nextStep={timer.nextStep}
        elapsedSec={timer.elapsedSec}
        secondsToNext={timer.secondsToNext}
        isPaused={timer.isPaused}
        isCompleted={timer.isCompleted}
      />

      {timer.awaitingConfirmation && timer.nextStep && timer.confirmLabel && (
        <ManualConditionPrompt
          nextStep={timer.nextStep}
          label={timer.confirmLabel}
          onConfirm={timer.confirmNext}
        />
      )}

      <TimerControls
        isPaused={timer.isPaused}
        canGoBack={timer.currentStep.index > 0}
        canGoNext={timer.nextStep !== null}
        onPause={store.pause}
        onResume={store.resume}
        onNext={timer.next}
        onPrevious={timer.previous}
        onReset={() => {
          store.reset();
          navigate("/");
        }}
        onFinish={store.complete}
      />

      {timer.wakeLockSupported && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <MonitorSmartphone className="h-3 w-3" aria-hidden />
          {timer.wakeLockHeld
            ? "抽出中は画面を消しません"
            : "画面の自動消灯はオフにできます（設定）"}
        </p>
      )}

      <details className="rounded-xl border border-border bg-card">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
          <Eye className="h-4 w-4" aria-hidden />
          全ステップを表示
        </summary>
        <div className="px-3 pb-3">
          <BrewStepList computed={computed} currentIndex={timer.currentStep.index} compact />
        </div>
      </details>
    </div>
  );
}
