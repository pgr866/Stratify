import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bitcoin, Landmark, FileChartPie, AlignHorizontalDistributeCenter, ChartNoAxesCombined, Loader2 } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { CandleChart } from "./components/candle-chart";
import { StrategyChart } from "./components/strategy-chart";
import { DateTimeRangePicker } from "./components/date-time-range-picker";
import { Combobox } from "@/components/combobox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { getAllExchanges, getExchangeMarkets, Strategy as StrategyType, getStrategy, getUserStrategies, createStrategy, updateStrategy, deleteStrategy } from "@/api";
import { useSession } from "@/App";

export function Strategy() {
  const params = useParams<{ id: string }>();
  const [id, setId] = useState(params.id);
  const { user } = useSession();
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [symbols, setSymbols] = useState([]);
  const [timeframes, setTimeframes] = useState([]);
  const [indicators, setIndicators] = useState(["MACD", "RSI", "Bollinger Bands", "Moving Average"]);
  const [selectedStrategy, setSelectedStrategy] = useState();
  const prevStrategyRef = useRef(selectedStrategy);
  const [selectedExchange, setSelectedExchange] = useState();
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedDatetimeRange, setSelectedDatetimeRange] = useState();
  const [resetKey, setResetKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const tagConfig = [
    {
      condition: (value: string) => !value.includes(":"),
      label: "Spot",
      className: "bg-primary text-primary-foreground"
    },
    {
      condition: (value: string) => value.includes(":"),
      label: "Perpetual",
      className: "bg-destructive text-destructive-foreground"
    }
  ]

  useEffect(() => {
    getAllExchanges()
      .then((response: { data: string[] }) => setExchanges(response.data.map((exchange) => exchange[0].toUpperCase() + exchange.slice(1))))
      .catch((error) => toast("Failed to fetch exchanges", { description: error.message }));
  }, []);

  useEffect(() => {
    getStrategy(id)
      .then((response: StrategyType) => setSelectedStrategy(response.data))
      .catch((error) => toast("Failed to load strategy", { description: error.message }));
    getUserStrategies()
      .then((response: { data: StrategyType[] }) => setStrategies(response.data.map(({ id, name }) => ({ id, name }))))
      .catch((error) => toast("Failed to fetch your strategies", { description: error.message }));
  }, [id]);

  useEffect(() => {
    if (selectedStrategy?.id !== prevStrategyRef.current?.id) {
      setIsLoading(true);
      prevStrategyRef.current = selectedStrategy;
      setSelectedSymbol(selectedStrategy.symbol);
      setSelectedTimeframe(selectedStrategy.timeframe);
      setSelectedExchange(selectedStrategy.exchange.charAt(0).toUpperCase() + selectedStrategy.exchange.slice(1));
      setSelectedDatetimeRange({from: 1747008000000, to: 1747011600000});
      setTimeout(() => setIsLoading(false));
    }
  }, [selectedStrategy]);

  useEffect(() => {
    if (selectedExchange) {
      setSymbols([]);
      setTimeframes([]);
      getExchangeMarkets(selectedExchange.toLowerCase())
        .then((response: { data: string[] }) => {
          const newSymbols = response.data.symbols.map((symbol) => symbol.symbol);
          const newTimeframes = response.data.timeframes;
          if (!newSymbols.includes(selectedSymbol)) {
            setSelectedSymbol(newSymbols[0]);
          }
          if (!newTimeframes.includes(selectedTimeframe)) {
            setSelectedTimeframe(newTimeframes[0]);
          }
          setSymbols(newSymbols);
          setTimeframes(newTimeframes);
        })
        .catch((error) => toast("Failed to fetch symbols", { description: error.message }))
        .finally(() => setIsLoading(false));
    }
  }, [selectedExchange]);

  useEffect(() => {
    if (!selectedStrategy || !symbols.length || !timeframes.length || !selectedExchange ||
      !selectedSymbol || !selectedTimeframe || !selectedDatetimeRange || isLoading) return;
    console.log(selectedExchange, selectedSymbol, selectedTimeframe, selectedDatetimeRange); // will be getCandles soon
    if (selectedStrategy.exchange.toLowerCase() !== selectedExchange ||
      selectedStrategy.symbol !== selectedSymbol ||
      selectedStrategy.timeframe !== selectedTimeframe) {
      setIsLoading(true);
      updateStrategy(selectedStrategy.id, { ...selectedStrategy, exchange: selectedExchange.toLowerCase(), symbol: selectedSymbol, timeframe: selectedTimeframe })
        .then((response: StrategyType) => setSelectedStrategy(response.data))
        .catch((error) => toast("Failed to update strategy", { description: error.message }))
        .finally(() => setIsLoading(false));
    }
  }, [symbols, timeframes, selectedSymbol, selectedTimeframe, selectedDatetimeRange]);

  const handleOnChangeStrategy = (value) => {
    const newStrategyId = strategies.find((s) => s.name === value).id;
    navigate(`/strategy/${newStrategyId}`);
    setIsLoading(true);
    getStrategy(newStrategyId)
      .then((response: StrategyType) => setSelectedStrategy(response.data))
      .catch((error) => toast("Failed to load strategy", { description: error.message }))
      .finally(() => setIsLoading(false));
  }

  const handleCreateStrategy = () => {
    createStrategy()
      .then((response: StrategyType) => {
        const newId = response.data.id;
        setId(newId);
        navigate(`/strategy/${newId}`);
      })
      .catch((error) => toast("Failed to create new strategy", { description: error.message }));
  }

  const handleRenameStrategy = (oldValue: string, newValue: string) => {
    setIsLoading(true);
    updateStrategy(selectedStrategy.id, { ...selectedStrategy, name: newValue })
      .then((response: StrategyType) => {
        setSelectedStrategy(response.data)
        setStrategies(prev =>
          prev.map(strategy =>
            strategy.id === selectedStrategy.id ? { ...strategy, name: newValue } : strategy
          )
        );
      })
      .catch((error) => toast("Failed to rename strategy", { description: error.message }))
      .finally(() => setIsLoading(false));
  }

  const handleDeleteStrategy = () => {
    try {
      setIsLoading(true);
      deleteStrategy(selectedStrategy.id)
      const newStrategies = strategies.filter(strategy => strategy.id !== selectedStrategy.id);
      if ([...newStrategies].length) {
        setStrategies(newStrategies);
        const newId = newStrategies.at(0).id;
        setId(newId);
        navigate(`/strategy/${newId}`);
      } else {
        navigate(`/portal`);
      }
      setOpenDeleteDialog(false);
      toast("Strategy deleted successfully");
    } catch (error) {
      console.error("Error deleting strategy:", error);
      toast("Failed to delete strategy", { description: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  }

  const handleIndicatorsComboboxChange = (newValue: string) => {
    console.log("New indicator selected:", newValue);
    setResetKey((prevKey: number) => prevKey + 1);
  };

  const handlePublish = async () => {
    setIsLoading(true);
    updateStrategy(selectedStrategy.id, { ...selectedStrategy, is_public: !selectedStrategy.is_public })
      .then((response: StrategyType) => setSelectedStrategy(response.data))
      .catch((error) => toast("Failed to update strategy", { description: error.message }))
      .finally(() => setIsLoading(false));
  };

  return (
    <ResizablePanelGroup direction="vertical" style={{ width: "100vw", height: "100vh" }} className="border">
      <ResizablePanel defaultSize={50} className="flex flex-col">
        <div className="flex flex-wrap items-center">
          <Button variant={"ghost"} size={"sm"} onClick={() => navigate("/portal")}>
            <img src="/logo.svg" alt="Logo" className="logo size-6" />
          </Button>
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Combobox value={selectedStrategy?.name} values={strategies.map(s => s.name)} onCreate={handleCreateStrategy} onChange={(value) => handleOnChangeStrategy(value)} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"192px"} placeholder={"Strategy"} icon={<FileChartPie />} onEdit={handleRenameStrategy} onDelete={() => setOpenDeleteDialog(true)} />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Combobox value={selectedExchange} values={exchanges} onChange={(value) => { setIsLoading(true); setSelectedExchange(value); }} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"185px"} placeholder={"Exchange"} icon={<Landmark />} />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Combobox value={selectedSymbol} values={symbols} onChange={(value) => setSelectedSymbol(value)} isLoading={isLoading} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"185px"} placeholder={"Symbol"} icon={<Bitcoin />} tagConfig={tagConfig} />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Select value={selectedTimeframe}
            onValueChange={(value) => setSelectedTimeframe(value)}>
            <SelectTrigger
              disabled={isLoading}
              size="sm"
              className="w-[100px] h-9 border-0 gap-1.5 shadow-none focus:outline-none !bg-transparent hover:!bg-accent dark:hover:!bg-accent/50">
              <AlignHorizontalDistributeCenter size={16} className="text-foreground" />
              {isLoading && <Loader2 className="animate-spin ml-2" />}
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent className="w-[160px]">
              <SelectGroup>
                <SelectLabel>Timeframes</SelectLabel>
                {timeframes.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <DateTimeRangePicker variant={"ghost"} size={"sm"} width={"312px"}
            timezone={user.timezone}
            range={selectedDatetimeRange}
            onChange={(newRange) => {
              setSelectedDatetimeRange(newRange);
            }}
          />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Combobox key={resetKey} values={indicators} variant={"ghost"} size={"sm"} width={"160px"} placeholder={"Indicators"}
            onChange={handleIndicatorsComboboxChange} icon={<ChartNoAxesCombined />} />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Button variant={"ghost"} size={"sm"} className="w-[170px] overflow-hidden font-normal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 28 28" style={{ width: "24", height: "24" }}>
              <path stroke="currentColor" strokeWidth="1.5" d="m20 17-5 5m0-5 5 5M9 11.5h7M17.5 8a2.5 2.5 0 0 0-5 0v11a2.5 2.5 0 0 1-5 0" />
            </svg>
            Order conditions
          </Button>
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <ThemeToggle size="9" />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Button size={"sm"} onClick={handlePublish} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="animate-spin mx-6.5" />
            ) : (
              selectedStrategy?.is_public ? "Unpublish" : "\u00A0\u00A0Publish\u00A0\u00A0"
            )}
          </Button>
        </div>
        <CandleChart></CandleChart>
      </ResizablePanel>
      <Dialog open={openDeleteDialog} onOpenChange={() => setOpenDeleteDialog(false)}>
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Confirm <span className="capitalize">{selectedStrategy?.name}</span> Strategy Deletion
            </DialogTitle>
            <DialogDescription>
              <strong>Are you sure you want to delete this Strategy?</strong><br />
              This action cannot be undone, and you will lose access to this trading strategy and its associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleDeleteStrategy()} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ResizableHandle />
      <ResizablePanel defaultSize={50} className="flex justify-center items-center">
        <StrategyChart />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
