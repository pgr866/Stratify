import { useEffect, useRef } from "react";
import { createOptionsChart, LineSeries, HistogramSeries, CrosshairMode } from "lightweight-charts";

export function ResultsChart({ netProfit, drawdown, hodlingProfit }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const series = useRef({});

  const getCssColor = (name) => {
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    x.fillRect(0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
    c.remove();
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getChartOptions = () => ({
    layout: {
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

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
    const chart = createOptionsChart(container, {
      ...getChartOptions(),
      width: container.clientWidth,
      height: container.clientHeight,
    });
    chartInstance.current = chart;
    series.current.drawdown = chart.addSeries(HistogramSeries, {
      color: document.documentElement.classList.contains('dark') ? "#2F104B" : "#E3C4FF",
      priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false,
    });
    series.current.netProfit = chart.addSeries(LineSeries, {
      lineWidth: 1.5, priceScaleId: 'left',
      priceLineVisible: false, lastValueVisible: false,
    });
    series.current.hodling = chart.addSeries(LineSeries, {
      color: "#2962ff", lineWidth: 1.5, priceScaleId: 'left',
      priceLineVisible: false, lastValueVisible: false,
    });
    chart.timeScale().fitContent();
    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      chart.resize(width, height);
    });
    resizeObserver.observe(container);
    const themeObserver = new MutationObserver(() => {
      chart.applyOptions(getChartOptions());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      chart.remove();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;
    if (!netProfit.length || !drawdown.length || !hodlingProfit.length) return;
    series.current.netProfit.setData(netProfit.map((v, i) => ({ time: i + 1, value: v })).map(dp => ({ ...dp, color: dp.value > 0 ? '#22AB94' : '#DD3240' })));
    series.current.drawdown.setData(drawdown.map((v, i) => ({ time: i + 1, value: v })));
    series.current.hodling.setData(hodlingProfit.map((v, i) => ({ time: i + 1, value: v })));
    chartInstance.current.timeScale().fitContent();
  }, [netProfit, drawdown, hodlingProfit]);

  return (
    <div className="size-full" >
      <div ref={chartRef} className="size-full" />
    </div>
  );
}
