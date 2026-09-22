import { useState } from "react";
import { Check, ChevronRight, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { recipesByGroup } from "@/data/recipes";
import { SOURCE_TYPE_LABELS } from "@/lib/labels";
import { formatTime } from "@/lib/format";
import type { Recipe } from "@/domain/recipe.types";

export interface MethodSelectorProps {
  selectedId: string;
  favorites: string[];
  onSelect: (recipeId: string) => void;
  onToggleFavorite: (recipeId: string) => void;
}

function RecipeRow({
  recipe,
  selected,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  recipe: Recipe;
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <li className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        data-testid={`recipe-option-${recipe.id}`}
        className={`pressable flex-1 rounded-lg border px-3 py-3 text-left ${
          selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
        }`}
      >
        <div className="flex items-start gap-2">
          {/* 色だけで選択状態を示さない: チェックアイコンも併記する */}
          <span className="mt-0.5 w-4 shrink-0">
            {selected && <Check className="h-4 w-4 text-primary" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{recipe.name}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{recipe.description}</span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {SOURCE_TYPE_LABELS[recipe.sourceType]}
              </Badge>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                基準 {recipe.reference.doseG}g / {recipe.reference.waterG}g ・{" "}
                {recipe.reference.temperatureC}℃ ・ 目安{" "}
                {formatTime(recipe.reference.targetFinishSec)}
              </span>
            </span>
          </span>
        </div>
      </button>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto w-11 shrink-0 p-0"
        onClick={onToggleFavorite}
        aria-pressed={favorite}
        aria-label={`${recipe.name}を${favorite ? "お気に入りから外す" : "お気に入りに追加"}`}
        data-testid={`favorite-${recipe.id}`}
      >
        <Star className={`h-4 w-4 ${favorite ? "fill-primary text-primary" : ""}`} aria-hidden />
      </Button>
    </li>
  );
}

export function MethodSelector({
  selectedId,
  favorites,
  onSelect,
  onToggleFavorite,
}: MethodSelectorProps) {
  const [open, setOpen] = useState(false);
  const groups = recipesByGroup();
  const selected = groups.flatMap((g) => g.recipes).find((r) => r.id === selectedId);

  return (
    <Card>
      <CardContent className="p-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="pressable flex min-h-[44px] w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/50"
              data-testid="open-method-selector"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">抽出メソッド</span>
                <span
                  className="block truncate text-base font-semibold"
                  data-testid="selected-recipe-name"
                >
                  {selected?.name ?? "レシピを選ぶ"}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </DialogTrigger>

          <DialogContent className="max-h-[85vh] max-w-[600px] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>抽出メソッドを選ぶ</DialogTitle>
              <DialogDescription>
                調査レポート収録の 10 レシピと、Brew Mate 独自の 3 メソッドから選べます。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {favorites.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground">お気に入り</h3>
                  <ul className="space-y-2">
                    {groups
                      .flatMap((g) => g.recipes)
                      .filter((r) => favorites.includes(r.id))
                      .map((recipe) => (
                        <RecipeRow
                          key={`fav-${recipe.id}`}
                          recipe={recipe}
                          selected={recipe.id === selectedId}
                          favorite
                          onSelect={() => {
                            onSelect(recipe.id);
                            setOpen(false);
                          }}
                          onToggleFavorite={() => onToggleFavorite(recipe.id)}
                        />
                      ))}
                  </ul>
                </section>
              )}

              {groups.map((group) => (
                <section key={group.group}>
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </h3>
                  <ul className="space-y-2">
                    {group.recipes.map((recipe) => (
                      <RecipeRow
                        key={recipe.id}
                        recipe={recipe}
                        selected={recipe.id === selectedId}
                        favorite={favorites.includes(recipe.id)}
                        onSelect={() => {
                          onSelect(recipe.id);
                          setOpen(false);
                        }}
                        onToggleFavorite={() => onToggleFavorite(recipe.id)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {selected && (
          <p className="px-2 pb-1 pt-1 text-xs text-muted-foreground">
            {selected.author ? `${selected.author} ・ ` : ""}
            {selected.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
