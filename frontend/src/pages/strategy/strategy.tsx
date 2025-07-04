import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bitcoin, Landmark, FileChartPie, AlignHorizontalDistributeCenter, ChartNoAxesCombined, Loader2 } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { CandleChart } from "./components/candle-chart";
import { StrategyResults } from "./components/strategy-results/strategy-results";
import { DateTimeRangePicker } from "@/components/date-time-range-picker";
import { Combobox } from "@/components/combobox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { getAllExchanges, getExchangeSymbols, Strategy as StrategyType, getStrategy, getUserStrategies, createStrategy, updateStrategy, deleteStrategy, cloneStrategy, Candle, getCandles, StrategyExecution } from "@/api";
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
  const indicatorNames = [
    { name: "Relative Strength Index", short_name: "RSI" },
    { name: "Simple Moving Average", short_name: "SMA" },
    { name: "Exponential Moving Average", short_name: "EMA" },
    { name: "Bollinger Bands", short_name: "BBANDS" },
    { name: "MACD", short_name: "MACD" },
    { name: "Aroon", short_name: "AROON" },
    { name: "Average Directional Index", short_name: "ADX" },
    { name: "Commodity Channel Index", short_name: "CCI" },
    { name: "Money Flow Index", short_name: "MFI" },
    { name: "Momentum", short_name: "MOM" },
    { name: "Rate of Change", short_name: "ROC" },
    { name: "Stochastic", short_name: "STOCH" },
    { name: "Stochastic RSI", short_name: "STOCHRSI" },
    { name: "TRIX", short_name: "TRIX" },
    { name: "Ultimate Oscillator", short_name: "ULTOSC" },
    { name: "Williams %R", short_name: "WILLR" },
    { name: "On Balance Volume", short_name: "OBV" },
    { name: "Parabolic SAR", short_name: "SAR" },
    { name: "Average True Range", short_name: "ATR" },
    { name: "Chaikin A/D Line", short_name: "AD" },
  ];
  const [selectedStrategy, setSelectedStrategy] = useState();
  const prevStrategyRef = useRef(selectedStrategy);
  const [selectedExchange, setSelectedExchange] = useState();
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedDatetimeRange, setSelectedDatetimeRange] = useState();
  const isUpdatingDatetimeRange = useRef(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedStrategyExecution, setSelectedStrategyExecution] = useState<StrategyExecution>();
  const hasExecutionUrl = useRef(false);

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
      .catch((error) => toast("Failed to fetch exchanges", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    getStrategy(id)
      .then((response: StrategyType) => setSelectedStrategy({ ...response.data, indicators: JSON.parse(response.data.indicators ?? '[]') }))
      .catch((error) => toast("Failed to load strategy", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (selectedStrategy?.id !== prevStrategyRef.current?.id) {
      if (selectedStrategy.user === user.id) {
        getUserStrategies()
          .then((response: { data: StrategyType[] }) => setStrategies(response.data.map(({ id, name }) => ({ id, name }))))
          .catch((error) => toast("Failed to fetch your strategies", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
      }
      prevStrategyRef.current = selectedStrategy;
      if (hasExecutionUrl.current) return;
      setSelectedSymbol(selectedStrategy.symbol);
      setSelectedTimeframe(selectedStrategy.timeframe);
      setSelectedExchange(selectedStrategy.exchange.charAt(0).toUpperCase() + selectedStrategy.exchange.slice(1));
      setSelectedDatetimeRange({ from: selectedStrategy.timestamp_start, to: selectedStrategy.timestamp_end });
    }
  }, [selectedStrategy]);

  useEffect(() => {
    if (selectedExchange) {
      setSymbols([]);
      setTimeframes([]);
      getExchangeSymbols(selectedExchange.toLowerCase())
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
        .catch((error) => toast("Failed to fetch symbols", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
        .finally(() => setIsLoading(false));
    }
  }, [selectedExchange]);

  useEffect(() => {
    if (!selectedStrategy || !symbols.length || !timeframes.length || !selectedExchange ||
      !selectedSymbol || !selectedTimeframe || !selectedDatetimeRange || isLoading) return;
    if (isUpdatingDatetimeRange.current) {
      isUpdatingDatetimeRange.current = false;
      return;
    }
    setIsLoading(true);
    setCandles([]);
    getCandles(selectedExchange.toLowerCase(), selectedSymbol, selectedTimeframe, selectedDatetimeRange.from, selectedDatetimeRange.to)
      .then((response: Candle[]) => {
        if (response.data.length === 0) {
          toast("Failed to fetch candles", { description: "No candle data found in the selected range." });
        } else {
          setCandles(response.data);
          isUpdatingDatetimeRange.current = true;
          setSelectedDatetimeRange({ from: response.data[0].time, to: response.data[response.data.length - 1].time });
          if (response.data.length > 50000) {
            toast("Data has been truncated to the most recent 50,000 candles");
          }
        }
      })
      .catch((error) => toast("Failed to fetch candles", { description: error.response?.data?.error ?? error.message }))
      .finally(() => setIsLoading(false));
    if ((selectedStrategy.exchange.toLowerCase() !== selectedExchange ||
      selectedStrategy.symbol !== selectedSymbol ||
      selectedStrategy.timeframe !== selectedTimeframe ||
      selectedStrategy.timestamp_start !== selectedDatetimeRange.from ||
      selectedStrategy.timestamp_end !== selectedDatetimeRange.to) &&
      user?.id === selectedStrategy?.user) {
      updateStrategy(selectedStrategy.id,
        {
          ...selectedStrategy,
          exchange: selectedExchange.toLowerCase(),
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          timestamp_start: selectedDatetimeRange.from,
          timestamp_end: selectedDatetimeRange.to,
          indicators: selectedStrategyExecution?.indicators ?? JSON.stringify(selectedStrategy.indicators),
        })
        .then((response: StrategyType) => setSelectedStrategy({ ...response.data, indicators: JSON.parse(response.data.indicators ?? '[]') }))
        .catch((error) => toast("Failed to update strategy", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
    }
  }, [symbols, timeframes, selectedSymbol, selectedTimeframe, selectedDatetimeRange]);

  const handleOnChangeStrategy = (value) => {
    const newStrategyId = strategies.find((s) => s.name === value).id;
    navigate(`/strategy/${newStrategyId}`);
    setId(newStrategyId);
  }

  const handleCreateStrategy = () => {
    setIsLoading(true);
    createStrategy()
      .then((response: StrategyType) => {
        const newId = response.data.id;
        setId(newId);
        navigate(`/strategy/${newId}`);
        toast("Strategy created successfully");
      })
      .catch((error) => toast("Failed to create new strategy", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
      .finally(() => setIsLoading(false));
  }

  const handleRenameStrategy = (oldValue: string, newValue: string) => {
    setIsLoading(true);
    updateStrategy(selectedStrategy.id, { ...selectedStrategy, name: newValue, indicators: JSON.stringify(selectedStrategy.indicators) })
      .then((response: StrategyType) => {
        setSelectedStrategy({ ...response.data, indicators: JSON.parse(response.data.indicators ?? '[]') })
        setStrategies(prev =>
          prev.map(strategy =>
            strategy.id === selectedStrategy.id ? { ...strategy, name: newValue } : strategy
          )
        );
        toast("Strategy renamed successfully");
      })
      .catch((error) => toast("Failed to rename strategy", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
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
        navigate(`/strategy/${newId}`);
        setId(newId);
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

  const handleCloneStrategy = async () => {
    setIsLoading(true);
    const url = new URL(window.location.href)
    const executionId = url.searchParams.get("execution")
    cloneStrategy(selectedStrategy.id, executionId ?? undefined)
      .then((response: StrategyType) => {
        const newId = response.data.id;
        setId(newId);
        if (executionId) {
          window.location.href = `/strategy/${newId}?execution=${executionId}`;
        } else {
          window.location.href = `/strategy/${newId}`;
        }
        toast("Strategy cloned successfully");
      })
      .catch((error) => toast("Failed to clone strategy", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
      .finally(() => setIsLoading(false));
  };

  const handleIndicatorsComboboxChange = (newValue: string) => {
    const selectedIndicator = indicatorNames.find(ind => ind.name === newValue);
    if (!selectedIndicator) return;
    setResetKey((prevKey: number) => prevKey + 1);
    updateStrategy(selectedStrategy.id, {
      ...selectedStrategy, indicators: JSON.stringify([...(selectedStrategy.indicators ?? []),
      { id: crypto.randomUUID().replace(/-/g, '').slice(0, 10), name: selectedIndicator.name, short_name: selectedIndicator.short_name }])
    })
      .then((response: StrategyType) => setSelectedStrategy({ ...response.data, indicators: JSON.parse(response.data.indicators ?? '[]') }))
      .catch((error) => toast("Failed to update strategy", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
  };

  return (
    <ResizablePanelGroup direction="vertical" style={{ width: "100vw", height: "100vh" }} className="border">
      <ResizablePanel defaultSize={50} className="flex flex-col">
        <div className="flex flex-wrap items-center">
          <Button className="px-2" variant={"ghost"} size={"sm"} onClick={() => window.location.href = "/portal"}>
            <img src="/logo.svg" alt="Logo" className="logo size-6" />
          </Button>
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Combobox value={selectedStrategy?.name} values={strategies.map(s => s.name)} onCreate={handleCreateStrategy} onChange={(value) => handleOnChangeStrategy(value)} isLoading={isLoading} disabled={!user?.id || user?.id !== selectedStrategy?.user} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"190px"} placeholder={"Strategy"} icon={<FileChartPie />} onEdit={handleRenameStrategy} onDelete={() => setOpenDeleteDialog(true)} />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Combobox value={selectedExchange} values={exchanges} onChange={(value) => value !== selectedExchange && (setIsLoading(true), setSelectedExchange(value))} isLoading={isLoading} disabled={!user?.id || user?.id !== selectedStrategy?.user} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"180px"} placeholder={"Exchange"} icon={<Landmark />} />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Combobox value={selectedSymbol} values={symbols} onChange={(value) => setSelectedSymbol(value)} isLoading={isLoading} disabled={!user?.id || user?.id !== selectedStrategy?.user} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"187px"} placeholder={"Symbol"} icon={<Bitcoin />} tagConfig={tagConfig} />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Select value={selectedTimeframe}
            onValueChange={(value) => setSelectedTimeframe(value)}>
            <SelectTrigger
              disabled={isLoading || !user?.id || user?.id !== selectedStrategy?.user}
              size="sm"
              className="w-[100px] h-9 border-0 gap-1.5 shadow-none focus:outline-none !bg-transparent hover:!bg-accent dark:hover:!bg-accent/50">
              <AlignHorizontalDistributeCenter size={16} className="text-foreground" />
              {isLoading && <Loader2 className="animate-spin ml-2.5" />}
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
            disabled={isLoading || !user?.id || user?.id !== selectedStrategy?.user}
          />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Combobox key={resetKey} values={indicatorNames.map(indicator => indicator.name)} variant={"ghost"} size={"sm"} width={"241px"} placeholder={"Indicator"}
            onChange={handleIndicatorsComboboxChange} icon={<ChartNoAxesCombined />} isLoading={isLoading} disabled={!user?.id || user?.id !== selectedStrategy?.user} />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <ThemeToggle size="9" />
          <Separator orientation="vertical" className="!h-5 mx-0.5" />
          <Button size={"sm"} onClick={handleCloneStrategy} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="animate-spin mx-3.5" />
            ) : (
              "Clone"
            )}
          </Button>
        </div>
        <CandleChart candles={candles} selectedStrategy={selectedStrategy} setSelectedStrategy={setSelectedStrategy} setIsLoading={setIsLoading} selectedStrategyExecution={selectedStrategyExecution} />
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
      <ResizablePanel defaultSize={50} className="flex flex-col">
        <StrategyResults
          selectedStrategy={selectedStrategy}
          setSelectedStrategy={setSelectedStrategy}
          setSelectedExchange={setSelectedExchange}
          setSelectedSymbol={setSelectedSymbol}
          setSelectedTimeframe={setSelectedTimeframe}
          setSelectedDatetimeRange={setSelectedDatetimeRange}
          selectedStrategyExecution={selectedStrategyExecution}
          setSelectedStrategyExecution={setSelectedStrategyExecution}
          hasExecutionUrl={hasExecutionUrl}
          isLoading={isLoading}
          setIsLoading={setIsLoading} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
