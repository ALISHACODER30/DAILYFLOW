import { useCallback, useEffect, useState } from "react";
import { completeTask, getBriefing, getInsights, getStandup, getTasks } from "./api";
import AiPanel from "./components/AiPanel";
import BriefingCard from "./components/BriefingCard";
import Header from "./components/Header";
import TaskManager from "./components/TaskManager";
import { AiNewsCard, WebTipCard } from "./components/WebFeed";

export default function App() {
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingError, setBriefingError] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);

  const loadBriefing = useCallback(async (refresh = false) => {
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      setBriefing(await getBriefing(refresh));
    } catch (e) {
      setBriefingError(e.message);
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      setTasks(await getTasks());
    } catch (e) {
      setTasksError(e.message);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBriefing();
    loadTasks();
  }, [loadBriefing, loadTasks]);

  async function handleComplete(id) {
    const updated = await completeTask(id);
    setTasks((ts) => ts.map((t) => (t.id === id ? updated : t)));
  }

  const hasCompleted = tasks.some((t) => t.completed);
  const bothPanels = hasCompleted && tasks.length >= 3;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Header onRefresh={() => loadBriefing(true)} refreshing={briefingLoading} />
      <BriefingCard
        briefing={briefing}
        loading={briefingLoading}
        error={briefingError}
        onRetry={() => loadBriefing()}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <WebTipCard />
        <AiNewsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TaskManager
            tasks={tasks}
            loading={tasksLoading}
            error={tasksError}
            onAdded={(t) => setTasks((ts) => [...ts, t])}
            onComplete={handleComplete}
            onRetry={loadTasks}
          />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          {hasCompleted && (
            <AiPanel
              className={bothPanels ? "flex-1" : ""}
              mono
              title="Standup"
              description="Turn what you finished today into a ready-to-send update."
              buttonLabel="Generate Standup"
              fetcher={async () => (await getStandup()).standup}
              copyable
            />
          )}
          {tasks.length >= 3 && (
            <AiPanel
              className={bothPanels ? "flex-1" : ""}
              title="Daily Insights"
              description="See when you work best and where to improve."
              buttonLabel="Get Insights"
              fetcher={async () => (await getInsights()).insights}
            />
          )}
        </div>
      </div>
    </div>
  );
}
