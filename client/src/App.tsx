import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Characters from "./pages/Characters";
import ContentPipeline from "./pages/ContentPipeline";
import ContentCalendar from "./pages/ContentCalendar";
import Analytics from "./pages/Analytics";
import Monetization from "./pages/Monetization";
import FanInteractions from "./pages/FanInteractions";
import Settings from "./pages/Settings";
import Landing from "./pages/Landing";

function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/characters" component={Characters} />
        <Route path="/pipeline" component={ContentPipeline} />
        <Route path="/calendar" component={ContentCalendar} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/monetization" component={Monetization} />
        <Route path="/fans" component={FanInteractions} />
        <Route path="/settings" component={Settings} />
        <Route component={Dashboard} />
      </Switch>
    </DashboardLayout>
  );
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" nest component={DashboardRouter} />
      <Route path="/characters" component={DashboardRouter} />
      <Route path="/pipeline" component={DashboardRouter} />
      <Route path="/calendar" component={DashboardRouter} />
      <Route path="/analytics" component={DashboardRouter} />
      <Route path="/monetization" component={DashboardRouter} />
      <Route path="/fans" component={DashboardRouter} />
      <Route path="/settings" component={DashboardRouter} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
