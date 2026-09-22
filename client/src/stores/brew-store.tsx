import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  EMPTY_ARRANGEMENT,
  type Arrangement,
  type BrewSettings,
  type BrewStatus,
  type ComputedRecipe,
  type RecipeMode,
} from "@/domain/brew.types";
import {
  IDLE_CLOCK,
  pauseClock,
  resumeClock,
  startClock,
  type BrewClock,
} from "@/domain/brew-clock";
import { computeRecipe } from "@/domain/recipe-calculator";
import { defaultControlValues, type ControlValues } from "@/domain/recipe.types";
import { DEFAULT_RECIPE_ID, getRecipeOrDefault } from "@/data/recipes";
import { readJson, removeKey, writeJson } from "@/lib/storage";

const PREFS_KEY = "brew-mate:prefs:v1";
const SESSION_KEY = "brew-mate:session:v1";

/** 設定・お気に入りなど、抽出をまたいで残る状態 */
interface Preferences {
  recipeId: string;
  /** レシピごとの豆量（レシピで適正量が大きく違うため個別に覚える） */
  doseByRecipe: Record<string, number>;
  controlsByRecipe: Record<string, ControlValues>;
  modeByRecipe: Record<string, RecipeMode>;
  arrangementByRecipe: Record<string, Arrangement>;
  settings: BrewSettings;
  favorites: string[];
}

/** 進行中の抽出の状態 */
interface Session {
  status: BrewStatus;
  recipeId: string;
  currentStepIndex: number;
  clock: BrewClock;
  /** 各ステップが実際に開始した経過秒 */
  stepStartedSec: (number | undefined)[];
}

export interface BrewState {
  prefs: Preferences;
  session: Session;
  /** 保存された進行中セッションを復元するか確認待ち */
  restorePrompt: Session | null;
  hydrated: boolean;
}

const initialPreferences: Preferences = {
  recipeId: DEFAULT_RECIPE_ID,
  doseByRecipe: {},
  controlsByRecipe: {},
  modeByRecipe: {},
  arrangementByRecipe: {},
  settings: DEFAULT_SETTINGS,
  favorites: [],
};

const idleSession: Session = {
  status: "idle",
  recipeId: DEFAULT_RECIPE_ID,
  currentStepIndex: 0,
  clock: IDLE_CLOCK,
  stepStartedSec: [],
};

const initialState: BrewState = {
  prefs: initialPreferences,
  session: idleSession,
  restorePrompt: null,
  hydrated: false,
};

type Action =
  | { type: "hydrate"; prefs: Preferences; restorePrompt: Session | null }
  | { type: "selectRecipe"; recipeId: string }
  | { type: "setDose"; doseG: number }
  | { type: "setControl"; controlId: string; value: string }
  | { type: "setMode"; mode: RecipeMode }
  | { type: "setArrangement"; patch: Arrangement }
  | { type: "resetArrangement" }
  | { type: "toggleFavorite"; recipeId: string }
  | { type: "updateSettings"; patch: Partial<BrewSettings> }
  | { type: "openPreview" }
  | { type: "start"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "advanceTo"; index: number; atSec: number }
  | { type: "goBack" }
  | { type: "awaitConfirmation" }
  | { type: "complete" }
  | { type: "reset" }
  | { type: "restoreSession" }
  | { type: "discardSession" };

function reducer(state: BrewState, action: Action): BrewState {
  switch (action.type) {
    case "hydrate":
      return { ...state, prefs: action.prefs, restorePrompt: action.restorePrompt, hydrated: true };

    case "selectRecipe":
      if (action.recipeId === state.prefs.recipeId) return state;
      return {
        ...state,
        prefs: { ...state.prefs, recipeId: action.recipeId },
        // レシピを変えたら進行中の抽出は破棄する
        session: { ...idleSession, recipeId: action.recipeId },
      };

    case "setDose":
      return {
        ...state,
        prefs: {
          ...state.prefs,
          doseByRecipe: { ...state.prefs.doseByRecipe, [state.prefs.recipeId]: action.doseG },
        },
      };

    case "setControl": {
      const recipeId = state.prefs.recipeId;
      const current = state.prefs.controlsByRecipe[recipeId] ?? {};
      return {
        ...state,
        prefs: {
          ...state.prefs,
          controlsByRecipe: {
            ...state.prefs.controlsByRecipe,
            [recipeId]: { ...current, [action.controlId]: action.value },
          },
        },
      };
    }

    case "setMode":
      return {
        ...state,
        prefs: {
          ...state.prefs,
          modeByRecipe: { ...state.prefs.modeByRecipe, [state.prefs.recipeId]: action.mode },
        },
      };

    case "setArrangement": {
      const recipeId = state.prefs.recipeId;
      const current = state.prefs.arrangementByRecipe[recipeId] ?? EMPTY_ARRANGEMENT;
      return {
        ...state,
        prefs: {
          ...state.prefs,
          arrangementByRecipe: {
            ...state.prefs.arrangementByRecipe,
            [recipeId]: { ...current, ...action.patch },
          },
        },
      };
    }

    case "resetArrangement": {
      const next = { ...state.prefs.arrangementByRecipe };
      delete next[state.prefs.recipeId];
      return { ...state, prefs: { ...state.prefs, arrangementByRecipe: next } };
    }

    case "toggleFavorite": {
      const favorites = state.prefs.favorites.includes(action.recipeId)
        ? state.prefs.favorites.filter((id) => id !== action.recipeId)
        : [...state.prefs.favorites, action.recipeId];
      return { ...state, prefs: { ...state.prefs, favorites } };
    }

    case "updateSettings":
      return {
        ...state,
        prefs: { ...state.prefs, settings: { ...state.prefs.settings, ...action.patch } },
      };

    case "openPreview":
      return {
        ...state,
        session: { ...idleSession, recipeId: state.prefs.recipeId, status: "preview" },
      };

    case "start":
      return {
        ...state,
        session: {
          status: "running",
          recipeId: state.prefs.recipeId,
          currentStepIndex: 0,
          clock: startClock(action.now),
          stepStartedSec: [0],
        },
      };

    case "pause":
      if (
        state.session.status !== "running" &&
        state.session.status !== "waiting_for_confirmation"
      ) {
        return state;
      }
      return {
        ...state,
        session: {
          ...state.session,
          status: "paused",
          clock: pauseClock(state.session.clock, action.now),
        },
      };

    case "resume":
      if (state.session.status !== "paused") return state;
      return {
        ...state,
        session: {
          ...state.session,
          status: "running",
          clock: resumeClock(state.session.clock, action.now),
        },
      };

    case "advanceTo": {
      const stepStartedSec = [...state.session.stepStartedSec];
      stepStartedSec[action.index] = action.atSec;
      return {
        ...state,
        session: {
          ...state.session,
          status: "running",
          currentStepIndex: action.index,
          stepStartedSec,
        },
      };
    }

    case "goBack": {
      const index = Math.max(0, state.session.currentStepIndex - 1);
      const stepStartedSec = [...state.session.stepStartedSec];
      // 巻き戻した先より後の実績は捨てる
      for (let i = index + 1; i < stepStartedSec.length; i++) stepStartedSec[i] = undefined;
      return {
        ...state,
        session: { ...state.session, status: "running", currentStepIndex: index, stepStartedSec },
      };
    }

    case "awaitConfirmation":
      if (state.session.status !== "running") return state;
      return { ...state, session: { ...state.session, status: "waiting_for_confirmation" } };

    case "complete":
      return { ...state, session: { ...state.session, status: "completed" } };

    case "reset":
      return {
        ...state,
        session: { ...idleSession, recipeId: state.prefs.recipeId },
        restorePrompt: null,
      };

    case "restoreSession":
      if (!state.restorePrompt) return state;
      return {
        ...state,
        prefs: { ...state.prefs, recipeId: state.restorePrompt.recipeId },
        session: state.restorePrompt,
        restorePrompt: null,
      };

    case "discardSession":
      return {
        ...state,
        restorePrompt: null,
        session: { ...idleSession, recipeId: state.prefs.recipeId },
      };

    default:
      return state;
  }
}

export interface BrewStore extends BrewState {
  computed: ComputedRecipe;
  doseG: number;
  controls: ControlValues;
  mode: RecipeMode;
  arrangement: Arrangement;
  isFavorite: boolean;
  selectRecipe: (recipeId: string) => void;
  setDose: (doseG: number) => void;
  setControl: (controlId: string, value: string) => void;
  setMode: (mode: RecipeMode) => void;
  setArrangement: (patch: Arrangement) => void;
  resetArrangement: () => void;
  toggleFavorite: (recipeId: string) => void;
  updateSettings: (patch: Partial<BrewSettings>) => void;
  openPreview: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  advanceTo: (index: number, atSec: number) => void;
  goBack: () => void;
  awaitConfirmation: () => void;
  complete: () => void;
  reset: () => void;
  restoreSession: () => void;
  discardSession: () => void;
}

const BrewContext = createContext<BrewStore | null>(null);

function loadPreferences(): Preferences {
  const stored = readJson<Partial<Preferences>>(PREFS_KEY);
  if (!stored) return initialPreferences;
  return {
    ...initialPreferences,
    ...stored,
    settings: { ...DEFAULT_SETTINGS, ...(stored.settings ?? {}) },
    doseByRecipe: stored.doseByRecipe ?? {},
    controlsByRecipe: stored.controlsByRecipe ?? {},
    modeByRecipe: stored.modeByRecipe ?? {},
    arrangementByRecipe: stored.arrangementByRecipe ?? {},
    favorites: stored.favorites ?? [],
  };
}

/** 保存された進行中セッションを読む。復元しても自動再開はしない */
function loadRestorableSession(): Session | null {
  const stored = readJson<Session>(SESSION_KEY);
  if (!stored || stored.clock?.startedAt == null) return null;
  const resumable: BrewStatus[] = ["running", "paused", "waiting_for_confirmation"];
  if (!resumable.includes(stored.status)) return null;
  return {
    ...stored,
    // 再読み込み直後は必ず停止状態にして、ユーザーの確認を待つ
    status: "paused",
    clock: stored.clock.pausedAt === null ? pauseClock(stored.clock, Date.now()) : stored.clock,
    stepStartedSec: stored.stepStartedSec ?? [],
  };
}

export function BrewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    dispatch({ type: "hydrate", prefs: loadPreferences(), restorePrompt: loadRestorableSession() });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    writeJson(PREFS_KEY, state.prefs);
  }, [state.prefs, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const { status } = state.session;
    if (status === "idle" || status === "preview" || status === "completed") {
      removeKey(SESSION_KEY);
    } else {
      writeJson(SESSION_KEY, state.session);
    }
  }, [state.session, state.hydrated]);

  const recipe = getRecipeOrDefault(state.prefs.recipeId);
  const doseG = state.prefs.doseByRecipe[recipe.id] ?? recipe.reference.doseG;
  const controls = useMemo(
    () => ({ ...defaultControlValues(recipe), ...(state.prefs.controlsByRecipe[recipe.id] ?? {}) }),
    [recipe, state.prefs.controlsByRecipe],
  );
  const mode = state.prefs.modeByRecipe[recipe.id] ?? "original";
  const arrangement = state.prefs.arrangementByRecipe[recipe.id] ?? EMPTY_ARRANGEMENT;

  const computed = useMemo(
    () =>
      computeRecipe({
        recipe,
        doseG,
        controls,
        mode,
        arrangement,
        absorptionFactor: state.prefs.settings.absorptionFactor,
      }),
    [recipe, doseG, controls, mode, arrangement, state.prefs.settings.absorptionFactor],
  );

  const value = useMemo<BrewStore>(
    () => ({
      ...state,
      computed,
      doseG,
      controls,
      mode,
      arrangement,
      isFavorite: state.prefs.favorites.includes(recipe.id),
      selectRecipe: (recipeId) => dispatch({ type: "selectRecipe", recipeId }),
      setDose: (value_) => dispatch({ type: "setDose", doseG: value_ }),
      setControl: (controlId, value_) => dispatch({ type: "setControl", controlId, value: value_ }),
      setMode: (m) => dispatch({ type: "setMode", mode: m }),
      setArrangement: (patch) => dispatch({ type: "setArrangement", patch }),
      resetArrangement: () => dispatch({ type: "resetArrangement" }),
      toggleFavorite: (recipeId) => dispatch({ type: "toggleFavorite", recipeId }),
      updateSettings: (patch) => dispatch({ type: "updateSettings", patch }),
      openPreview: () => dispatch({ type: "openPreview" }),
      start: () => dispatch({ type: "start", now: Date.now() }),
      pause: () => dispatch({ type: "pause", now: Date.now() }),
      resume: () => dispatch({ type: "resume", now: Date.now() }),
      advanceTo: (index, atSec) => dispatch({ type: "advanceTo", index, atSec }),
      goBack: () => dispatch({ type: "goBack" }),
      awaitConfirmation: () => dispatch({ type: "awaitConfirmation" }),
      complete: () => dispatch({ type: "complete" }),
      reset: () => dispatch({ type: "reset" }),
      restoreSession: () => dispatch({ type: "restoreSession" }),
      discardSession: () => dispatch({ type: "discardSession" }),
    }),
    [state, computed, doseG, controls, mode, arrangement, recipe.id],
  );

  return <BrewContext.Provider value={value}>{children}</BrewContext.Provider>;
}

export function useBrewStore(): BrewStore {
  const store = useContext(BrewContext);
  if (!store) throw new Error("useBrewStore は BrewProvider の内側で使ってください");
  return store;
}
