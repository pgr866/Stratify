import { useState, useEffect, useRef } from "react";
import { createOptionsChart, LineSeries, HistogramSeries, BaselineSeries, CrosshairMode } from "lightweight-charts";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ResultsChart({ absCumProfit, relCumProfit, absDrawdown, relDrawdown, absHodlingProfit, relHodlingProfit }) {
  const chartInstance = useRef(null);
  const series = useRef({});
  const [isNetProfitChecked, setIsNetProfitChecked] = useState(true);
  const [isDrawdownChecked, setIsDrawdownChecked] = useState(true);
  const [isHodlingProfitChecked, setIsHodlingProfitChecked] = useState(true);
  const [selectedTab, setSelectedTab] = useState("percentage");

  const getCssColor = (name) => {
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    x.fillRect(0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
    c.remove();
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getDrawdownColor = () =>
    document.documentElement.classList.contains('dark') ? "#2F104B" : "#E3C4FF";

  const getChartOptions = () => ({
    layout: {
      width: '100%',
      height: '100%',
      background: { color: getCssColor("--background") },
      textColor: getCssColor("--foreground"),
      fontFamily: getComputedStyle(document.body).fontFamily,
    },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    timeScale: { borderVisible: false },
    rightPriceScale: { visible: true, borderVisible: false, alignLabels: false, scaleMargins: { bottom: 0.03, top: 0.03 } },
    leftPriceScale: { visible: true, borderVisible: false, alignLabels: false, scaleMargins: { bottom: 0.03, top: 0.03 } },
    handleScroll: false,
    handleScale: false,
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: getCssColor("--muted-foreground"),
        labelBackgroundColor: getCssColor("--foreground"),
      },
      horzLine: {
        color: getCssColor("--muted-foreground"),
        labelBackgroundColor: getCssColor("--foreground"),
      },
    },
    localization: { locale: 'en' },
  });

  function updateChart() {
    const chartContainer = document.getElementById('result-chart-container');
    chartContainer.style.position = 'relative';
    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = chartContainer.getBoundingClientRect();
      chartInstance.current.resize(width, height);
      console.log(width, height);
      // chartContainer.querySelector('.tv-lightweight-charts').style.width = '100%';
      // chartContainer.querySelector('.tv-lightweight-charts').style.height = '100%';
      // chartContainer.querySelector('table').style.width = '100%';
      // chartContainer.querySelector('table').style.height = '100%';
    });
    resizeObserver.observe(chartContainer);
    resizeObserver.observe(chartContainer.parentElement);
    const themeObserver = new MutationObserver(() => {
      chartInstance.current.applyOptions(getChartOptions());
      series.current.drawdown.applyOptions({ color: getDrawdownColor() });
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      chartInstance.current.remove();
    };
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      const chartContainer = document.getElementById('result-chart-container');
      if (!chartContainer) return;
      chartInstance.current = createOptionsChart(chartContainer, getChartOptions());
      series.current.drawdown = chartInstance.current.addSeries(HistogramSeries, {
        color: getDrawdownColor(), priceScaleId: 'right',
        priceLineVisible: false, lastValueVisible: false,
      });
      series.current.cumProfit = chartInstance.current.addSeries(BaselineSeries, {
        priceScaleId: 'left',
        relativeGradient: true,
        topFillColor1: 'rgba(46, 189, 133, 0.3)',
        topFillColor2: 'rgba(46, 189, 133, 0.1)',
        bottomFillColor1: 'rgba(246, 70, 93, 0.1)',
        bottomFillColor2: 'rgba(246, 70, 93, 0.3)',
        topLineColor: 'rgba(46, 189, 133, 1)',
        bottomLineColor: 'rgba(246, 70, 93, 1)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.current.hodlingProfit = chartInstance.current.addSeries(LineSeries, {
        color: "#2962ff", lineWidth: 1, priceScaleId: 'left',
        priceLineVisible: false, lastValueVisible: false,
      });
      return updateChart();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!chartInstance.current) return;
      if (!absCumProfit.length || !relCumProfit.length || !absDrawdown.length || !relDrawdown.length || !absHodlingProfit.length || !relHodlingProfit.length) return;
      const cumProfitData = selectedTab === "percentage" ? relCumProfit : absCumProfit;
      const drawdownData = selectedTab === "percentage" ? relDrawdown : absDrawdown;
      const hodlingData = selectedTab === "percentage" ? relHodlingProfit : absHodlingProfit;
      series.current.cumProfit.setData(cumProfitData.map((v, i) => ({ time: i + 1, value: v })));
      series.current.drawdown.setData(drawdownData.map((v, i) => ({ time: i + 1, value: v })));
      series.current.hodlingProfit.setData(hodlingData.map((v, i) => ({ time: i + 1, value: v })));
      chartInstance.current.timeScale().fitContent();
    }, 0);
    return () => clearTimeout(timeout);
  }, [selectedTab, absCumProfit]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div id="result-chart-container" className="flex-1 h-full overflow-hidden" />
      <div className="w-full h-fit flex flex-none items-center gap-4 justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox id="cumProfit" checked={isNetProfitChecked} onCheckedChange={(checked) => {
              setIsNetProfitChecked(checked);
              series.current.cumProfit.applyOptions({ visible: checked });
            }} />
            <Label>Net profit</Label>
            <svg className="size-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
              <path fill="currentColor" d="m13 6.3-.5-1-.5 1-1.5 3-.6-1-.4-1-.5 1-2 4 1 .4 1.5-3 .6 1 .4 1 .5-1 1.5-3 2.6 5 .9-.4-3-6ZM2.4 15H3v-1h-.5v1ZM4
              15h1v-1H4v1Zm2 0h1v-1H6v1Zm2 0h1v-1H8v1Zm2-1v1h1v-1h-1Zm2 0v1h1v-1h-1Zm2 1h1v-1h-1v1Zm2 0h1v-1h-1v1Zm2 0h1v-1h-1v1Zm2 0h1v-1h-1v1Zm2 0h1v-1h-1v1Zm2
              0h1v-1h-1v1Zm2 0h.5v-1H26v1ZM4 18.3l1-2 1 .4-1 2-1-.4Zm20-5.6 1-2-1-.4-1 2 1 .4Zm-6 3.6-1 .4 2 4 .5 1 .5-1 2-4-1-.4-1.5 3-1.6-3Z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="drawdown" checked={isDrawdownChecked} onCheckedChange={(checked) => {
              setIsDrawdownChecked(checked);
              series.current.drawdown.applyOptions({ visible: checked });
            }} />
            <Label>Drawdown</Label>
            <svg className="size-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
              <path fill="currentColor" fillRule="evenodd" d="M12 7v14h5V7h-5Zm4 1h-3v12h3V8Zm3 7v6h5v-6h-5Zm4 1h-3v4h3v-4ZM5 12h5v9H5v-9Zm1 1h3v7H6v-7Z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="hodlingProfit" checked={isHodlingProfitChecked} onCheckedChange={(checked) => {
              setIsHodlingProfitChecked(checked);
              series.current.hodlingProfit.applyOptions({ visible: checked });
            }} />
            <Label>Buy & Hodl profit</Label>
            <svg className="size-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
              <path fill="currentColor" d="m25.4 7.3-8.8 11-6-5.5-7.2 8.5-.8-.6 7.8-9.4 6 5.5 8.2-10.1.8.6Z" />
            </svg>
          </div>
        </div>
        <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="h-auto">
          <div className="flex flex-wrap items-center h-auto">
            <TabsList className="flex flex-wrap h-auto bg-transparent gap-1 p-0" style={{ marginTop: '0' }}>
              <TabsTrigger value="percentage">
                Percentage
              </TabsTrigger>
              <TabsTrigger value="absolute">
                Absolute
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
