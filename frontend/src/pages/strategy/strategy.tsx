import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bitcoin, Landmark, FileChartPie, AlignHorizontalDistributeCenter, ChartNoAxesCombined } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { CandleChart } from "./components/candle-chart";
import { DateTimeRangePicker } from "./components/date-time-range-picker";
import { Combobox } from "@/components/combobox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { getAllExchanges } from "@/api";

export function Strategy() {
  const navigate = useNavigate();
  const strategies = ["MACD", "RSI", "Bollinger Bands", "Moving Average"];
  const [exchanges, setExchanges] = useState([]);
  const symbols = ["BTC/USDT", "ETH/USDT", "XRP/USDT", "LTC/USDT"];
  const timeframes = ["1m", "5m", "15m", "30m", "45m", "1h", "2h", "4h", "1d", "1w", "1M"];
  const indicators = ["MACD", "RSI", "Bollinger Bands", "Moving Average"];
  const selectedStrategy = strategies[0];
  const selectedExchange = "Binance";
  const selectedSymbol = "BTC/USDT";
  const selectedTimeframe = "1h";
  const [resetKey, setResetKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getAllExchanges()
      .then((response: { data: string[] }) => setExchanges(response.data.map((exchange) => exchange[0].toUpperCase() + exchange.slice(1))))
      .catch((error) => toast("Failed to fetch exchanges", { description: error.message }));
  }, []);

  const handleIndicatorsComboboxChange = (newValue: string) => {
    console.log("New indicator selected:", newValue);
    setResetKey((prevKey: number) => prevKey + 1);
  };

  const handlePublish = async () => {
		try {
			setIsLoading(true);
			toast("Publish successfully");
		} catch (error) {
			const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
			const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
				? Object.entries(axiosError.response.data).map(([k, v]) =>
					k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
				: "Something went wrong";
			toast("Publish failed", { description: errorMessage });
		} finally {
			setIsLoading(false);
		}
	};

  return (
    <ResizablePanelGroup direction="vertical" style={{ width: "100vw", height: "100vh" }} className="border">
      <ResizablePanel defaultSize={50} className="flex flex-col">
        <div className="flex flex-wrap items-center">
          <Button variant={"ghost"} size={"sm"} onClick={() => navigate("/portal")}>
            <img src="/logo.svg" alt="Logo" className="logo size-6"/>
          </Button>
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Combobox defaultValue={selectedStrategy} values={strategies} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"200px"} placeholder={"Strategy"} icon={<FileChartPie />} />
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Combobox defaultValue={selectedExchange} values={exchanges} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"160px"} placeholder={"Exchange"} icon={<Landmark />} />
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Combobox defaultValue={selectedSymbol} values={symbols} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"160px"} placeholder={"Symbol"} icon={<Bitcoin />} />
          <Separator orientation="vertical" className="!h-5 mx-1" />
          <Select defaultValue={selectedTimeframe}>
            <SelectTrigger
              size="sm"
              className="w-[100px] h-9 border-0 gap-1.5 shadow-none focus:outline-none !bg-transparent hover:!bg-accent dark:hover:!bg-accent/50">
              <AlignHorizontalDistributeCenter size={16} className="text-foreground" />
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
          <DateTimeRangePicker variant={"ghost"} size={"sm"} width={"310px"} />
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
          <Button size={"sm"} onClick={handlePublish} disabled={isLoading}>
							{isLoading ? (
								<><Loader2 className="animate-spin mr-2" />Publishing...</>
							) : (
								"Publish"
							)}
						</Button>
        </div>
        <CandleChart></CandleChart>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50} className="flex justify-center items-center">

      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
