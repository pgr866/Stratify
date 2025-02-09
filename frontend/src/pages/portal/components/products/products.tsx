import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { CandleChart } from "./components/candle-chart"
import { DateTimeRangePicker } from "./components/date-time-range-picker"

export function Products() {
  return (
    <ResizablePanelGroup direction="vertical" className="size-full rounded-lg border">
      <ResizablePanel defaultSize={50}>
        <CandleChart></CandleChart>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50} className="flex justify-center items-center">
        <DateTimeRangePicker />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
