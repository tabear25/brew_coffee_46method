import { AlertTriangle, Info } from "lucide-react";
import type { RecipeWarning } from "@/domain/brew.types";

export interface UnsupportedRangeWarningProps {
  warnings: RecipeWarning[];
}

/**
 * 推奨粉量範囲外・固定湯量・容量注意などの告知。
 * エラーで止めず、警告として表示するだけにとどめる。
 */
export function UnsupportedRangeWarning({ warnings }: UnsupportedRangeWarningProps) {
  if (warnings.length === 0) return null;

  return (
    <ul className="space-y-2" data-testid="recipe-warnings">
      {warnings.map((warning) => {
        const isWarning = warning.level === "warning";
        const Icon = isWarning ? AlertTriangle : Info;
        return (
          <li
            key={warning.id}
            role={isWarning ? "alert" : undefined}
            data-testid={`warning-${warning.id}`}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
              isWarning
                ? "border-destructive/40 bg-destructive/10 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {/* 色だけで区別しないよう、種別を文字でも示す */}
              <span className="sr-only">{isWarning ? "警告: " : "補足: "}</span>
              {warning.message}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
