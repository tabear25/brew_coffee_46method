import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BrewLog } from "@shared/schema";
import { ROAST_LEVELS } from "@/lib/brew-calculator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Coffee,
  Droplets,
  Timer,
  Hash,
  Star,
  Trash2,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getRoastLabel(value: string): string {
  return ROAST_LEVELS.find((r) => r.value === value)?.label ?? value;
}

const flavorLabels: Record<string, string> = {
  sweet: "甘め",
  balanced: "バランス",
  bright: "明るめ",
};

const strengthLabels: Record<string, string> = {
  light: "軽め",
  medium: "標準",
  strong: "濃いめ",
};

export default function LogsPage() {
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery<BrewLog[]>({
    queryKey: ["/api/brew-logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "./api/brew-logs");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `./api/brew-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brew-logs"] });
      toast({ title: "削除しました" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">まだ記録がありません</h3>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          計算機からコーヒーを淹れた後、記録を保存してみましょう
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {logs.length}件の記録
        </h2>
      </div>

      {logs.map((log) => (
        <Card key={log.id} className="group" data-testid={`log-card-${log.id}`}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">{log.beanName}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {log.beanOrigin && (
                    <span className="text-xs text-muted-foreground">{log.beanOrigin}</span>
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {getRoastLabel(log.roastLevel)}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {log.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < log.rating!
                            ? "fill-primary text-primary"
                            : "text-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteMutation.mutate(log.id)}
                  data-testid={`btn-delete-${log.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="flex items-center gap-1.5">
                <Coffee className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs tabular-nums">{log.coffeeGrams}g</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs tabular-nums">{log.waterGrams}g</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Timer className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs tabular-nums">{formatSeconds(log.brewTimeSeconds)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs tabular-nums">{log.pourCount}投</span>
              </div>
            </div>

            {/* Flavor tags */}
            <div className="flex items-center gap-1.5 mb-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                味: {flavorLabels[log.flavorBalance] ?? log.flavorBalance}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                濃度: {strengthLabels[log.strengthLevel] ?? log.strengthLevel}
              </Badge>
            </div>

            {/* Notes */}
            {log.notes && (
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {log.notes}
              </p>
            )}

            {/* Date */}
            <div className="text-[10px] text-muted-foreground/60">
              {format(new Date(log.createdAt), "yyyy/MM/dd HH:mm", { locale: ja })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
