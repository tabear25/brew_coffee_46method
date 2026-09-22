import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getRecipeOrDefault } from "@/data/recipes";
import { useBrewStore } from "@/stores/brew-store";

/**
 * ページ再読み込み後、進行中の抽出があれば復元するか尋ねる。
 * 自動再開はしない（意図せずタイマーが動き出さないように）。
 */
export function RestoreSessionDialog({ onRestore }: { onRestore: () => void }) {
  const { restorePrompt, restoreSession, discardSession } = useBrewStore();
  if (!restorePrompt) return null;

  const recipe = getRecipeOrDefault(restorePrompt.recipeId);

  return (
    <AlertDialog open>
      <AlertDialogContent data-testid="restore-session-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>抽出を再開しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{recipe.name}
            」の抽出が途中で残っています。再開すると一時停止した状態から続けられます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={discardSession} data-testid="restore-discard">
            破棄して最初から
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              restoreSession();
              onRestore();
            }}
            data-testid="restore-confirm"
          >
            抽出を再開する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
