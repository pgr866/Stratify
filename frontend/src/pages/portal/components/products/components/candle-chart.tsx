import { useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, CrosshairMode, createSeriesMarkers } from "lightweight-charts";

let randomFactor = 25 + Math.random() * 25;
const samplePoint = (i) => i * (0.5 + Math.sin(i / 10) * 0.2 + Math.sin(i / 20) * 0.4 + Math.sin(i / randomFactor) * 0.8 + Math.sin(i / 500) * 0.5) + 200;

function generateLineData(numberOfPoints = 500, endDate) {
	randomFactor = 25 + Math.random() * 25;
	const res = [];
	const date = endDate || new Date(Date.UTC(2018, 0, 1, 12, 0, 0, 0));
	date.setUTCDate(date.getUTCDate() - numberOfPoints - 1);
	for (let i = 0; i < numberOfPoints; ++i) {
		const time = date.getTime() / 1000;
		const value = samplePoint(i);
		res.push({ time, value });
		date.setUTCDate(date.getUTCDate() + 1);
	}
	return res;
}

function randomNumber(min, max) {
	return Math.random() * (max - min) + min;
}

function randomBar(lastClose) {
	const open = +randomNumber(lastClose * 0.95, lastClose * 1.05).toFixed(2);
	const close = +randomNumber(open * 0.95, open * 1.05).toFixed(2);
	const high = +randomNumber(Math.max(open, close), Math.max(open, close) * 1.1).toFixed(2);
	const low = +randomNumber(Math.min(open, close) * 0.9, Math.min(open, close)).toFixed(2);
	const volume = Math.floor(randomNumber(1000, 5000) * Math.abs(close - open));
	return { open, high, low, close, volume };
}

function generateCandleData(numberOfPoints = 250, endDate) {
	const lineData = generateLineData(numberOfPoints, endDate);
	let lastClose = lineData[0].value;
	return lineData.map((d) => {
		const candle = randomBar(lastClose);
		lastClose = candle.close;
		return {
			time: d.time,
			low: candle.low,
			high: candle.high,
			open: candle.open,
			close: candle.close,
			volume: candle.volume,
		};
	});
}

function calculateMovingAverageSeriesData(candleData, maLength) {
	const maData = [];
	for (let i = 0; i < candleData.length; i++) {
		if (i < maLength) {
			maData.push({ time: candleData[i].time });
		} else {
			let sum = 0;
			for (let j = 0; j < maLength; j++) {
				sum += candleData[i - j].close;
			}
			const maValue = sum / maLength;
			maData.push({ time: candleData[i].time, value: maValue });
		}
	}
	return maData;
}

function getChartOptions() {
	const getCssColor = (name) => `hsl(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;
	return {
		layout: {
			width: '100%',
			height: '100%',
			textColor: getCssColor("--foreground"),
			background: {
				type: 'gradient',
				topColor: document.documentElement.classList.contains("dark") ? '#1A1A1A' : '#E5E5E5',
				bottomColor: getCssColor("--background")
			},
			fontFamily: getComputedStyle(document.body).fontFamily,
		},
		grid: {
			vertLines: { color: getCssColor("--border") },
			horzLines: { color: getCssColor("--border") },
		},
		timeScale: { borderColor: getCssColor("--border") },
		rightPriceScale: { borderColor: getCssColor("--border"), autoScale: false },
		crosshair: {
			mode: CrosshairMode.Magnet,
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
	};
}

export function CandleChart() {
	useEffect(() => {
		const chartContainer = document.getElementById('chart-container');
		if (!chartContainer) return;

		const barData = generateCandleData(500);
		const maData = calculateMovingAverageSeriesData(barData, 20);

		const chart = createChart(chartContainer, getChartOptions());
		chart.timeScale().fitContent();
		const candlestickSeries = chart.addSeries(CandlestickSeries, {
			upColor: '#2EBD85',
			downColor: '#F6465D',
			borderVisible: false,
			wickUpColor: '#2EBD85',
			wickDownColor: '#F6465D',
		});
		candlestickSeries.setData(barData);

		const volumeData = barData.map(bar => ({
			time: bar.time,
			value: bar.volume,
			color: bar.close > bar.open ? 'rgba(46, 189, 133, 0.5)' : 'rgba(246, 70, 93, 0.5)'
		}));
		const volumeSeries = chart.addSeries(HistogramSeries, {
			priceFormat: { type: 'volume' },
			priceScaleId: '',
		});
		volumeSeries.priceScale().applyOptions({
			scaleMargins: {
				top: 0.7,
				bottom: 0,
			},
		});
		volumeSeries.setData(volumeData);

		const maSeries = chart.addSeries(LineSeries, { color: 'blue', lineWidth: 1 });
		maSeries.setData(maData);

		const markers = [
			{
				time: barData[barData.length - 2].time,
				position: 'aboveBar',
				color: '#F6465D',
				shape: 'arrowDown',
				text: 'Sell @1',
			},
			{
				time: barData[barData.length - 1].time,
				position: 'belowBar',
				color: '#2EBD85',
				shape: 'arrowUp',
				text: 'Buy @2',
			}
		];
		createSeriesMarkers(candlestickSeries, markers);

		const chartLegend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:15px;top:7px;z-index:10;font-size:13px;font-weight:400;color:var(--foreground);',
		});
		chartContainer.appendChild(chartLegend);
		const updateChartLegend = (param) => {
			const candleData = param.seriesData.get(candlestickSeries)
				?? candlestickSeries.dataByIndex(candlestickSeries.data().length - 1)
				?? '—';
			const volumeData = param.seriesData.get(volumeSeries)
				?? volumeSeries.dataByIndex(volumeSeries.data().length - 1)
				?? '—';
			const { open: o, high: h, low: l, close: c } = candleData;
			const change = ((c - o) / o * 100).toFixed(2);
			chartLegend.innerHTML = `
						O <span>${o}</span> 
						H <span>${h}</span> 
						L <span>${l}</span> 
						C <span>${c} (${change > 0 ? '+' : ''}${change}%)</span> 
						V <span>${volumeData.value}</span>
				`;
			chartLegend.querySelectorAll('span').forEach(el => el.style.color = c >= o ? '#2EBD85' : '#F6465D');
		}

		const subChartContainer = document.getElementById('subchart-container');
		if (!subChartContainer) return;
		const subChartData = generateLineData(500)
		const subChart = createChart(subChartContainer, getChartOptions());
		subChart.timeScale().fitContent();
		chart.timeScale().applyOptions({ visible: false });
		const subChartSeries = subChart.addSeries(LineSeries, { color: 'blue', lineWidth: 1 });
		subChartSeries.setData(subChartData);

		const subChartLegend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:15px;top:7px;z-index:10;font-size:13px;font-weight:400;color:var(--foreground);',
		});
		subChartContainer.appendChild(subChartLegend);
		const updateSubChartLegend = (param) => {
			const subChartData = param.seriesData.get(subChartSeries)
				?? subChartSeries.dataByIndex(subChartSeries.data().length - 1)
				?? '—';
			subChartLegend.innerHTML = `SubChart <span>${subChartData.value.toFixed(2)}</span>`;
			subChartLegend.querySelector('span').style.color = 'blue';
		}

		chart.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
			subChart.timeScale().setVisibleLogicalRange(timeRange);
		});
		subChart.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
			chart.timeScale().setVisibleLogicalRange(timeRange);
		});
		
		chart.subscribeCrosshairMove(param => {
			const dataPoint = param.seriesData.get(candlestickSeries) || null;
			if (param.time) {
				subChart.setCrosshairPosition(dataPoint.value, dataPoint.time, subChartSeries);
			} else {
				subChart.clearCrosshairPosition();
			}
			updateChartLegend(param);
			updateSubChartLegend(param);
		});
		subChart.subscribeCrosshairMove(param => {
			const dataPoint = param.seriesData.get(subChartSeries) || null;
			if (param.time) {
				chart.setCrosshairPosition(dataPoint.value, dataPoint.time, candlestickSeries);
			} else {
				chart.clearCrosshairPosition();
			}
			updateChartLegend(param);
			updateSubChartLegend(param);
		});

		const resizeChart = () => {
			let { width, height } = chartContainer.getBoundingClientRect();
			chart.resize(width, height);
			let { width: subWidth, height: subHeight } = subChartContainer.getBoundingClientRect();
			subChart.resize(subWidth, subHeight);
			chartContainer.querySelector('.tv-lightweight-charts').style.width = '100%';
			chartContainer.querySelector('.tv-lightweight-charts').style.height = '100%';
			chartContainer.querySelector('table').style.width = '100%';
			chartContainer.querySelector('table').style.height = '100%';
			subChartContainer.querySelector('.tv-lightweight-charts').style.width = '100%';
			subChartContainer.querySelector('.tv-lightweight-charts').style.height = '100%';
			subChartContainer.querySelector('table').style.width = '100%';
			subChartContainer.querySelector('table').style.height = '100%';
		};
		const resizeObserver = new ResizeObserver(resizeChart);
		resizeObserver.observe(chartContainer);
		resizeObserver.observe(subChartContainer);
		const themeObserver = new MutationObserver(() => {
			chart.applyOptions(getChartOptions());
			subChart.applyOptions(getChartOptions());
		});
		themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
		return () => {
			resizeObserver.disconnect();
			themeObserver.disconnect();
			chart.remove();
			subChart.remove();
		};
	}, []);

	return (
		<ResizablePanelGroup direction="vertical" className="size-full">
			<ResizablePanel defaultSize={70} className="relative">
				<div id="chart-container" className="size-full"></div>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={30} className="relative">
				<div id="subchart-container" className="size-full"></div>
			</ResizablePanel>
		</ResizablePanelGroup>
	)
}