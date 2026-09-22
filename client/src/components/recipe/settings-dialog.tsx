import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBrewStore } from "@/stores/brew-store";
import { isVibrationSupported } from "@/lib/feedback";
import { isWakeLockSupported } from "@/hooks/use-wake-lock";

function SettingRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        data-testid={`setting-${id}`}
      />
    </div>
  );
}

export function SettingsDialog({ trigger }: { trigger: ReactNode }) {
  const { prefs, updateSettings } = useBrewStore();
  const { settings } = prefs;
  const vibrationSupported = isVibrationSupported();
  const wakeLockSupported = isWakeLockSupported();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
          <DialogDescription>
            通知と計算の既定値を変更できます。端末が非対応の機能は自動的に無効になります。
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border">
          <SettingRow
            id="sound"
            label="ステップ切り替え音"
            description="次の注湯に移るタイミングで音を鳴らします。"
            checked={settings.soundEnabled}
            onChange={(soundEnabled) => updateSettings({ soundEnabled })}
          />
          <SettingRow
            id="vibration"
            label="バイブレーション"
            description={
              vibrationSupported
                ? "ステップ切り替え時に端末を振動させます。"
                : "この端末はバイブレーションに対応していません。"
            }
            checked={settings.vibrationEnabled && vibrationSupported}
            disabled={!vibrationSupported}
            onChange={(vibrationEnabled) => updateSettings({ vibrationEnabled })}
          />
          <SettingRow
            id="wakelock"
            label="抽出中は画面を消さない"
            description={
              wakeLockSupported
                ? "Screen Wake Lock API で画面の自動消灯を防ぎます。"
                : "このブラウザは Screen Wake Lock API に対応していません。"
            }
            checked={settings.wakeLockEnabled && wakeLockSupported}
            disabled={!wakeLockSupported}
            onChange={(wakeLockEnabled) => updateSettings({ wakeLockEnabled })}
          />

          <div className="py-3">
            <Label htmlFor="absorption" className="text-sm font-medium">
              吸水係数（g/g）
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              「推定出来上がり量 = 総湯量 − 豆量 ×
              吸水係数」に使う値です。実測に合わせて調整できます。
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="absorption"
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                max={5}
                value={settings.absorptionFactor}
                onChange={(event) => {
                  const parsed = Number.parseFloat(event.target.value);
                  if (Number.isNaN(parsed)) return;
                  updateSettings({ absorptionFactor: Math.min(5, Math.max(0, parsed)) });
                }}
                className="h-11 w-24 text-center tabular-nums"
                data-testid="setting-absorption"
              />
              <span aria-hidden className="text-sm text-muted-foreground">
                g/g
              </span>
            </div>
          </div>
        </div>

        <section className="rounded-lg bg-muted/40 p-3">
          <h3 className="text-xs font-semibold">キーボードショートカット（タイマー画面）</h3>
          <dl className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-mono">Space</dt>
              <dd>一時停止 / 再開</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-mono">→ / N</dt>
              <dd>次のステップへ</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-mono">← / P</dt>
              <dd>前のステップへ</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-mono">Enter</dt>
              <dd>状態を確認して次へ</dd>
            </div>
          </dl>
        </section>
      </DialogContent>
    </Dialog>
  );
}
