import { useState, useEffect } from "react";
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
import { getAllExchanges, getExchangeMarkets } from "@/api";
import { useSession } from "@/App";

export function Strategy() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState(["MACD", "RSI", "Bollinger Bands", "Moving Average"]);
  const [exchanges, setExchanges] = useState([]);
  const [symbols, setSymbols] = useState([]);
  const [timeframes, setTimeframes] = useState([]);
  const [indicators, setIndicators] = useState(["MACD", "RSI", "Bollinger Bands", "Moving Average"]);
  const [selectedStrategy, setSelectedStrategy] = useState(strategies[0]);
  const [selectedExchange, setSelectedExchange] = useState("Binance");
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1d");
  const [resetKey, setResetKey] = useState(0);
  const [isLoadingPublishing, setIsLoadingPublishing] = useState(false);
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
    setIsLoading(true);
    setSymbols([]);
    setTimeframes([]);
    getExchangeMarkets(selectedExchange.toLowerCase())
      .then((response: { data: string[] }) => {
        setSymbols(response.data.symbols.map((symbol) => symbol.symbol));
        setTimeframes(response.data.timeframes);
      })
      .catch((error) => toast("Failed to fetch symbols", { description: error.message }))
      .then(() => setIsLoading(false));
  }, [selectedExchange]);

  useEffect(() => {
    console.log(selectedSymbol, selectedTimeframe);
  }, [selectedSymbol, selectedTimeframe]);

  const handleEditStrategyName = (oldValue: string, newValue: string) => {
    setStrategies(prev => prev.map(strategy =>
      strategy === oldValue ? newValue : strategy
    ))
    setSelectedStrategy(newValue)
  }

  const handleDeleteStrategy = (value: string) => {
    try {
      setIsLoading(true);

      const newStrategies = strategies.filter(strategy => strategy !== value)
      const lastStrategy = newStrategies.at(0) ?? ""
      setStrategies(newStrategies)
      setSelectedStrategy(lastStrategy)
      setOpenDeleteDialog(false);
      toast("Strategy deleted successfully");
    } catch (error) {
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
    try {
      setIsLoadingPublishing(true);
      toast("Publish successfully");
    } catch (error) {
      const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
      const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
        ? Object.entries(axiosError.response.data).map(([k, v]) =>
          k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
        : "Something went wrong";
      toast("Publish failed", { description: errorMessage });
    } finally {
      setIsLoadingPublishing(false);
    }
  };

  return (
    <ResizablePanelGroup direction="vertical" style={{ width: "100vw", height: "100vh" }} className="border">
      <ResizablePanel defaultSize={50} className="flex flex-col">
        <div className="flex flex-wrap items-center">
          <Button variant={"ghost"} size={"sm"} onClick={() => navigate("/portal")}>
            <img src="/logo.svg" alt="Logo" className="logo size-6" />
          </Button>
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Combobox value={selectedStrategy} values={strategies} onChange={(value) => setSelectedStrategy(value)} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"200px"} placeholder={"Strategy"} icon={<FileChartPie />} onEdit={handleEditStrategyName} onDelete={() => setOpenDeleteDialog(true)} />
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Combobox value={selectedExchange} values={exchanges} onChange={(value) => setSelectedExchange(value)} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"170px"} placeholder={"Exchange"} icon={<Landmark />} />
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Combobox value={selectedSymbol} values={symbols} onChange={(value) => setSelectedSymbol(value)} isLoading={isLoading} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"180px"} placeholder={"Symbol"} icon={<Bitcoin />} tagConfig={tagConfig} />
          <Separator orientation="vertical" className="!h-5 mx-1" />
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
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <DateTimeRangePicker variant={"ghost"} size={"sm"} width={"310px"}
            onChange={(range) => {
              console.log("Fecha inicio:", range.from);
              console.log("Fecha fin:", range.to);
            }} />
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Combobox key={resetKey} values={indicators} variant={"ghost"} size={"sm"} width={"160px"} placeholder={"Indicators"}
            onChange={handleIndicatorsComboboxChange} icon={<ChartNoAxesCombined />} />
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Button variant={"ghost"} size={"sm"} className="w-[170px] overflow-hidden font-normal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 28 28" style={{ width: "24", height: "24" }}>
              <path stroke="currentColor" strokeWidth="1.5" d="m20 17-5 5m0-5 5 5M9 11.5h7M17.5 8a2.5 2.5 0 0 0-5 0v11a2.5 2.5 0 0 1-5 0" />
            </svg>
            Order conditions
          </Button>
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <ThemeToggle size="9" />
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Button size={"sm"} onClick={handlePublish} disabled={isLoading || isLoadingPublishing}>
            {isLoadingPublishing ? (
              <><Loader2 className="animate-spin mr-2" />Publishing...</>
            ) : (
              "Publish"
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
              Confirm <span className="capitalize">{selectedStrategy}</span> Strategy Deletion
            </DialogTitle>
            <DialogDescription>
              <strong>Are you sure you want to delete this Strategy?</strong><br />
              This action cannot be undone, and you will lose access to this trading strategy and its associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleDeleteStrategy(selectedStrategy)} disabled={isLoading} className="w-full">
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
