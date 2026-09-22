import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { BrewProvider } from "@/stores/brew-store";
import SetupPage from "@/pages/setup";
import PreviewPage from "@/pages/preview";
import TimerPage from "@/pages/timer";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={SetupPage} />
        <Route path="/preview" component={PreviewPage} />
        <Route path="/timer" component={TimerPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <TooltipProvider>
      <ThemeProvider>
        <BrewProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </BrewProvider>
      </ThemeProvider>
    </TooltipProvider>
  );
}

export default App;
