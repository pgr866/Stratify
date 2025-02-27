import { useState } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { CandleChart } from "./components/candle-chart"
import { DateTimeRangePicker } from "./components/date-time-range-picker"
import { Combobox } from "@/pages/portal/components/products/components/combobox"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export function Products() {
  const strategies = ["MACD", "RSI", "Bollinger Bands", "Moving Average"];
  const exchanges = ["Binance", "Coinbase", "Kraken", "Bitfinex"];
  const symbols = ["BTC/USDT", "ETH/USDT", "XRP/USDT", "LTC/USDT"];
  const timeframes = ["1m", "5m", "15m", "30m", "45m", "1h", "2h", "4h", "1d", "1w", "1M"];
  const indicators = ["MACD", "RSI", "Bollinger Bands", "Moving Average"];
  const selectedStrategy = strategies[0];
  const selectedExchange = "Binance";
  const selectedSymbol = "BTC/USDT";
  const selectedTimeframe = "1h";
  const [resetKey, setResetKey] = useState(0);

  const handleIndicatorsComboboxChange = (newValue: string) => {
    console.log("New indicator selected:", newValue);
    setResetKey((prevKey: number) => prevKey + 1);
  };

  return (
    <ResizablePanelGroup direction="vertical" className="size-full rounded-lg border">
      <ResizablePanel defaultSize={50}>
        <div className="flex flex-wrap items-center text-sm p-1">
          <Combobox defaultValue={selectedStrategy} values={strategies} variant={"ghost"} size={"sm"} width={"160px"} placeholder={"Strategy"} />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Combobox defaultValue={selectedExchange} values={exchanges} variant={"ghost"} size={"sm"} width={"160px"} placeholder={"Exchange"} />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Combobox defaultValue={selectedSymbol} values={symbols} variant={"ghost"} size={"sm"} width={"160px"} placeholder={"Symbol"} />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Select defaultValue={selectedTimeframe}>
            <SelectTrigger
              className="w-[130px] h-9 border-0 bg-transparent shadow-none focus:ring-0 focus:outline-none focus:ring-offset-0 hover:bg-accent hover:text-accent-foreground" >
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
          <Separator orientation="vertical" className="h-5 mx-1" />
          <DateTimeRangePicker variant={"ghost"} size={"sm"} width={"310px"} />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Combobox key={resetKey} values={indicators} variant={"ghost"} size={"sm"} width={"160px"} placeholder={"Indicators"} onChange={handleIndicatorsComboboxChange} />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button variant={"ghost"} size={"sm"} className="w-[170px] overflow-hidden font-normal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 28 28"
              style={{ width: "24", height: "24" }}>
              <path stroke="currentColor" d="m20 17-5 5m0-5 5 5M9 11.5h7M17.5 8a2.5 2.5 0 0 0-5 0v11a2.5 2.5 0 0 1-5 0" />
            </svg>
            Order conditions
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
