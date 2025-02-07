import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { CandleChart } from "./components/candle-chart"
import { DateTimeRangePicker } from "./components/date-time-range-picker"

export function Products() {
  return (
    <div className="size-full">
      <ResizablePanelGroup
        direction="vertical"
        className="size-full rounded-lg border"
      >
        <ResizablePanel defaultSize={50}>
          <CandleChart></CandleChart>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <div className="flex h-full items-center justify-center p-6">
            <DateTimeRangePicker></DateTimeRangePicker>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>

  )
}
