import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, History } from "lucide-react";
import { OrderConditions } from "./components/order-conditions/order-conditions";
import { Performance } from "./components/performance";
import { TradesTable } from "./components/trades-table";
import { Combobox } from "@/components/combobox";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { useSession } from "@/App";
import { Strategy, updateStrategy, StrategyExecution, getMyStrategyExecutions, getStrategyExecution, deleteStrategyExecution } from "@/api";

export function StrategyResults({ selectedStrategy, setSelectedStrategy, setSelectedExchange, setSelectedSymbol, setSelectedTimeframe, setSelectedDatetimeRange, selectedStrategyExecution, setSelectedStrategyExecution, hasExecutionUrl, isLoading, setIsLoading }) {
  const { user } = useSession();
  const [selectedTab, setSelectedTab] = useState("order-conditions");
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [strategyExecutions, setStrategyExecutions] = useState([]);
  const executionStateRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const url = new URL(window.location.href);
    const executionIdFromUrl = url.searchParams.get("execution");
    if (executionIdFromUrl && executionIdFromUrl !== selectedStrategyExecution?.id) {
      hasExecutionUrl.current = true;
      loadStrategyExecution(executionIdFromUrl);
    }
    return () => {
      executionStateRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (!isLoading || !selectedStrategyExecution ||
      selectedStrategy.exchange === selectedStrategyExecution.exchange &&
      selectedStrategy.symbol === selectedStrategyExecution.symbol &&
      selectedStrategy.timeframe === selectedStrategyExecution.timeframe &&
      selectedStrategy.timestamp_start === selectedStrategyExecution.timestamp_start &&
      selectedStrategy.timestamp_end === selectedStrategyExecution.timestamp_end &&
      JSON.stringify(selectedStrategy.indicators) === selectedStrategyExecution.indicators) return;
    setSelectedStrategyExecution();
  }, [selectedStrategy]);

  useEffect(() => {
    if (!selectedStrategy?.id) return;
    getMyStrategyExecutions(selectedStrategy.id)
      .then(response => {
        setStrategyExecutions(response.data.sort((a, b) => b.execution_timestamp - a.execution_timestamp));
        if (!strategyExecutions.some(exec => exec.id === selectedStrategyExecution?.id)) {
          setSelectedStrategyExecution();
        }
      })
      .catch(error => {
        setStrategyExecutions([]);
        toast("Failed to fetch strategy executions", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" });
      });
  }, [selectedStrategy?.id]);

  useEffect(() => {
    if (selectedStrategyExecution?.id) {
      const url = new URL(window.location.href);
      url.searchParams.set("execution", selectedStrategyExecution.id);
      window.history.replaceState({}, "", url.toString());
    } else {
      if (hasExecutionUrl.current) return;
      const url = new URL(window.location.href);
      url.searchParams.delete("execution");
      window.history.replaceState({}, "", url.toString());
    }
    executionStateRef.current = selectedStrategyExecution?.id;

    if (!selectedStrategyExecution) {
      setSelectedTab("order-conditions");
      return;
    }
    if (selectedStrategyExecution?.type === 'backtest' && selectedStrategyExecution?.running) {
      setSelectedTab("order-conditions");
    }
    if (isLoading) {
      hasExecutionUrl.current = false;
    }
    setSelectedExchange(selectedStrategyExecution.exchange.charAt(0).toUpperCase() + selectedStrategyExecution.exchange.slice(1));
    setSelectedSymbol(selectedStrategyExecution.symbol);
    setSelectedTimeframe(selectedStrategyExecution.timeframe);
    setSelectedDatetimeRange({ from: selectedStrategyExecution.timestamp_start, to: selectedStrategyExecution.timestamp_end });
    setSelectedStrategy(prev => ({ ...prev, indicators: JSON.parse(selectedStrategyExecution.indicators ?? '[]') }));
  }, [selectedStrategyExecution?.id]);

  const loadStrategyExecution = async (id: string) => {
    if (!id) return;
    executionStateRef.current = id;
    setIsLoadingResults(true);
    try {
      let running = true;
      let iterationCount = 0;
      while (running && executionStateRef.current === id || hasExecutionUrl.current) {
        const response = await getStrategyExecution(id);
        if (executionStateRef.current !== id) break;
        setSelectedStrategyExecution(response.data);
        running = response.data.running;
        if (running || hasExecutionUrl.current) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        if (hasExecutionUrl.current) {
          iterationCount++;
          if (iterationCount > 1) {
            hasExecutionUrl.current = false;
          }
        }
      }
    } catch (error: any) {
      toast("Failed to load strategy execution", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" });
      const url = new URL(window.location.href);
      url.searchParams.delete("execution");
      window.history.replaceState({}, "", url.toString());
    } finally {
      if (executionStateRef.current === id) {
        setIsLoadingResults(false);
      }
    }
  };

  const handlePublish = async () => {
    setIsLoading(true);
    updateStrategy(selectedStrategy.id, { ...selectedStrategy, is_public: !selectedStrategy.is_public, indicators: JSON.stringify(selectedStrategy.indicators) })
      .then((response: Strategy) => {
        setSelectedStrategy({ ...response.data, indicators: JSON.parse(response.data.indicators ?? '[]') });
        toast("Strategy visibility updated successfully", { description: "Your strategy is " + (response.data.is_public ? "public" : "private") + " now" });
      })
      .catch((error) => toast("Failed to update strategy visibility", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
      .finally(() => setIsLoading(false));
  };

  const handleDeleteStrategyExecution = () => {
    setIsLoadingResults(true);
    deleteStrategyExecution(selectedStrategyExecution.id)
      .then(response => {
        setStrategyExecutions(prev => prev.filter(se => se.id !== selectedStrategyExecution.id));
        setSelectedStrategyExecution();
        toast("Strategy execution deleted successfully", { description: "The strategy execution has been removed" });
      })
      .catch(error => toast("Failed to delete strategy execution", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
      .finally(() => setIsLoadingResults(false));
  }

  return (
    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="size-full py-1 gap-1">
      <div className="flex justify-between items-center w-full px-2">
        <div className="flex flex-1 justify-start gap-4 mr-4">
          <Combobox
            value={selectedStrategyExecution?.execution_timestamp ? format(toZonedTime(new Date(selectedStrategyExecution.execution_timestamp), user.timezone), "MMM dd yyyy, HH:mm") : ""}
            values={strategyExecutions.map(s => format(toZonedTime(new Date(s.execution_timestamp), user.timezone), "MMM dd yyyy, HH:mm"))}
            ids={strategyExecutions.map(execution => execution.id)}
            onChange={(value, id) => loadStrategyExecution(id)}
            searchable={false} variant={"outline"} size={"sm"} width={"215px"} placeholder={"Run"} icon={<History />} isLoading={isLoading}
            {...(user?.id && selectedStrategy?.user && user.id === selectedStrategy.user && {
              onCreate: () => setSelectedStrategyExecution(),
              onDelete: handleDeleteStrategyExecution,
            })}
          />
          {selectedStrategyExecution && (
            <p className={`mt-0.5 ${selectedStrategyExecution.running ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
              {selectedStrategyExecution.running ? 'Running' : 'Finished'}
            </p>
          )}
        </div>
        <div className="flex flex-none justify-center">
          <div className="flex flex-wrap items-center h-auto">
            <TabsList className="flex flex-wrap h-auto bg-transparent gap-1 p-0" style={{ marginTop: '0' }}>
              <TabsTrigger value="order-conditions">
                Order conditions
              </TabsTrigger>
              <TabsTrigger value="performance" disabled={!selectedStrategyExecution || selectedStrategyExecution?.type === 'backtest' && selectedStrategyExecution?.running}>
                Performance
              </TabsTrigger>
              <TabsTrigger value="trades-table" disabled={!selectedStrategyExecution || selectedStrategyExecution?.type === 'backtest' && selectedStrategyExecution?.running}>
                List of trades
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        <div className="flex flex-1 justify-end">
          {user?.id === selectedStrategy?.user && (
            <Button size="sm" onClick={handlePublish} disabled={isLoading} className="w-fit">
              {isLoading ? (
                <Loader2 className="animate-spin mx-6.5" />
              ) : (
                selectedStrategy?.is_public ? "Unpublish" : "\u00A0\u00A0Publish\u00A0\u00A0"
              )}
            </Button>
          )}
        </div>
      </div>
      <Separator />
      <TabsContent value="order-conditions" className="overflow-y-auto">
        <OrderConditions
          selectedStrategy={selectedStrategy}
          setStrategyExecutions={setStrategyExecutions}
          selectedStrategyExecution={selectedStrategyExecution}
          setSelectedStrategyExecution={setSelectedStrategyExecution}
          loadStrategyExecution={loadStrategyExecution}
          isLoading={isLoading} />
      </TabsContent>
      <TabsContent value="performance" className="h-full overflow-hidden flex flex-col">
        <Performance strategyExecution={selectedStrategyExecution} />
      </TabsContent>
      <TabsContent value="trades-table" className="h-full flex flex-col">
        <TradesTable trades={selectedStrategyExecution?.trades} symbol={selectedStrategyExecution?.symbol} />
      </TabsContent>
    </Tabs >
  );
}
