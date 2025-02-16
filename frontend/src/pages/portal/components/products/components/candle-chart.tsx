import { useEffect } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, BarSeries, CrosshairMode, createSeriesMarkers } from "lightweight-charts";

function generateLineData(numberOfPoints = 500, endDate) {
	const randomFactor = 25 + Math.random() * 25;
	const res = [];
	const date = endDate || new Date(Date.UTC(2018, 0, 1, 12, 0, 0, 0));
	date.setUTCDate(date.getUTCDate() - numberOfPoints - 1);
	for (let i = 0; i < numberOfPoints; ++i) {
		const time = date.getTime() / 1000;
		const value = (i * (0.5 + Math.sin(i / 10) * 0.2 + Math.sin(i / 20) * 0.4
			+ Math.sin(i / randomFactor) * 0.8 + Math.sin(i / 500) * 0.5)
			- 200) * (Math.random() > 0.5 ? 1 : -1);
		res.push({ time, value });
		date.setUTCDate(date.getUTCDate() + 1);
	}
	return res;
}

function generateCandleData(numberOfPoints = 250, endDate) {
	const randomNumber = (min, max) => Math.random() * (max - min) + min;
	const lineData = generateLineData(numberOfPoints, endDate);
	let lastClose = lineData[0].value;
	return lineData.map((d) => {
		const open = +(randomNumber(lastClose * 0.95, lastClose * 1.05)).toFixed(2);
		const close = +(randomNumber(open * 0.95, open * 1.05)).toFixed(2);
		const high = +(randomNumber(Math.max(open, close), Math.max(open, close) * 1.1)).toFixed(2);
		const low = +(randomNumber(Math.min(open, close) * 0.9, Math.min(open, close))).toFixed(2);
		const volume = Math.floor(randomNumber(1000, 5000) * Math.abs(close - open));
		lastClose = close;
		return { time: d.time, open, high, low, close, volume };
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

let legends = [];

const getCssColor = (name) => `hsl(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;

const setOpacity = (color: string, alpha: number): string => {
	const tempDiv = document.createElement("div");
	tempDiv.style.color = color;
	document.body.appendChild(tempDiv);
	const computedColor = getComputedStyle(tempDiv).color;
	document.body.removeChild(tempDiv);
	return computedColor.replace("rgb", "rgba").replace(")", `, ${alpha})`);
};

function getChartOptions() {
	return {
		layout: {
			width: '100%',
			height: '100%',
			textColor: getCssColor("--foreground"),
			background: {
				type: 'gradient',
				topColor: getCssColor("--muted"),
				bottomColor: getCssColor("--background")
			},
			fontFamily: getComputedStyle(document.body).fontFamily,
			panes: {
				separatorColor: getCssColor("--border"),
				separatorHoverColor: getCssColor("--border"),
				enableResize: true,
			},
		},
		grid: {
			vertLines: { color: getCssColor("--border") },
			horzLines: { color: getCssColor("--border") },
		},
		timeScale: { borderColor: getCssColor("--border") },
		rightPriceScale: { borderColor: getCssColor("--border"), autoScale: false },
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
	};
}

function createCandleChart(candleData, upColor = '#2EBD85', downColor = '#F6465D', markers = []) {
	const chartContainer = document.getElementById('chart-container');
	if (!chartContainer) return;
	const chart = createChart(chartContainer, getChartOptions());
	chart.timeScale().fitContent();
	chartContainer.style.position = 'relative';
	const candlestickSeries = chart.addSeries(CandlestickSeries, {
		upColor: upColor,
		downColor: downColor,
		borderVisible: false,
		wickUpColor: upColor,
		wickDownColor: downColor,
	});
	candlestickSeries.setData(candleData);

	const upColorOpacity = setOpacity(upColor, 0.5);
	const downColorOpacity = setOpacity(downColor, 0.5);

	const volumeData = candleData.map(bar => ({
		time: bar.time,
		value: bar.volume,
		color: bar.close > bar.open ? upColorOpacity : downColorOpacity
	}));
	const volumeSeries = chart.addSeries(HistogramSeries, {
		priceFormat: { type: 'volume' },
		priceScaleId: '',
	});
	volumeSeries.priceScale().applyOptions({
		scaleMargins: {
			top: 0.8,
			bottom: 0,
		},
	});
	volumeSeries.setData(volumeData);

	createSeriesMarkers(candlestickSeries, markers);

	document.documentElement.style.setProperty('--muted-opacity', setOpacity(getCssColor('--muted'), 0.6));
	const mainLegend = Object.assign(document.createElement('div'), {
		style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;',
	});
	chartContainer.appendChild(mainLegend);
	legends[0] = mainLegend;
	chart.subscribeCrosshairMove((param) => {
		const candleData = param.seriesData.get(candlestickSeries)
			?? candlestickSeries.data().at(-1)
			?? '—';
		const volumeData = param.seriesData.get(volumeSeries)
			?? volumeSeries.data().at(-1)
			?? '—';
		const { open: o, high: h, low: l, close: c } = candleData;
		const change = ((c - o) / o * 100).toFixed(2);
		const formattedVolume = volumeData.value >= 1000000
			? (volumeData.value / 1000000).toFixed(2) + ' M'
			: volumeData.value >= 1000
				? (volumeData.value / 1000).toFixed(2) + ' K'
				: volumeData.value;
		legends[0].innerHTML = `
			<text>
			O <span>${o}</span>
			H <span>${h}</span> 
			L <span>${l}</span> 
			C <span>${c} (${change > 0 ? '+' : ''}${change}%)</span> 
			V <span>${formattedVolume}</span>
			`;
		legends[0].querySelectorAll('span').forEach(el => el.style.color = c >= o ? upColor : downColor);
		legends[0].querySelectorAll('text').forEach(el => {
			el.style.backgroundColor = 'var(--muted-opacity)';
			el.style.padding = '0 5px';
			el.style.borderRadius = '5px';
		});
	});
	return chart;
}

function addLineSeries(chart, lineData, pane, getColor = () => 'blue', lineWidth = 1, lineStyle = 0, newLegend = false, legendLabel = '') {
	const lineSeries = chart.addSeries(LineSeries, { lineWidth: lineWidth, lineStyle: lineStyle }, pane);
	lineSeries.setData(
		lineData.map((dataPoint, index, array) => ({
			...dataPoint,
			color: getColor(dataPoint, index, array)
		}))
	);
	const chartContainer = document.getElementById('chart-container');
	if (legends.length < pane + 1) {
		const legend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;',
		});
		requestAnimationFrame(function checkTable() {
			const table = chartContainer.querySelector('table');
			if (!table || table.children.length < 4) {
				requestAnimationFrame(checkTable);
				return;
			}
			const divsWithCanvas = Array.from(table.children);
			divsWithCanvas.at(2 * pane).style.position = 'relative';
			divsWithCanvas.at(2 * pane).appendChild(legend);
		});
		legend.innerHTML = '';
		legends[pane] = legend;
	}
	chart.subscribeCrosshairMove((param) => {
		const lineData = param.seriesData.get(lineSeries)
			?? lineSeries.data().at(-1)
			?? '—';
		if (newLegend) {
			if (pane > 0) {
				legends[pane].innerHTML = `<text>${legendLabel} <span style="color:${lineData.color}">${lineData.value.toFixed(2)}</span>`;
			} else {
				legends[pane].innerHTML += `<br><text>${legendLabel} <span style="color:${lineData.color}">${lineData.value.toFixed(2)}</span>`;
			}
		} else {
			legends[pane].innerHTML += `<text><span style="color:${lineData.color}">${lineData.value.toFixed(2)}</span>`;
		}
		legends[pane].querySelectorAll('text').forEach(el => {
			el.style.backgroundColor = 'var(--muted-opacity)';
			el.style.padding = '0 5px';
			el.style.borderRadius = '5px';
		});
	});
	return lineSeries;
}

function addHistogramSeries(chart, histogramData, pane, getColor = () => 'green', newLegend = false, legendLabel = '') {
	const histogramSeries = chart.addSeries(HistogramSeries, {}, pane);
	histogramSeries.setData(
		histogramData.map((dataPoint, index, array) => ({
			...dataPoint,
			color: getColor(dataPoint, index, array)
		}))
	);
	const chartContainer = document.getElementById('chart-container');
	if (legends.length < pane + 1) {
		const legend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;',
		});
		requestAnimationFrame(function checkTable() {
			const table = chartContainer.querySelector('table');
			if (!table || table.children.length < 4) {
				requestAnimationFrame(checkTable);
				return;
			}
			const divsWithCanvas = Array.from(table.children);
			divsWithCanvas.at(2 * pane).style.position = 'relative';
			divsWithCanvas.at(2 * pane).appendChild(legend);
		});
		legend.innerHTML = '';
		legends[pane] = legend;
	}
	chart.subscribeCrosshairMove((param) => {
		const histogramData = param.seriesData.get(histogramSeries)
			?? histogramSeries.data().at(-1)
			?? '—';
		if (newLegend) {
			if (pane > 0) {
				legends[pane].innerHTML = `<text>${legendLabel} <span style="color:${histogramData.color}">${histogramData.value.toFixed(2)}</span>`;
			} else {
				legends[pane].innerHTML += `<br><text>${legendLabel} <span style="color:${histogramData.color}">${histogramData.value.toFixed(2)}</span>`;
			}
		} else {
			legends[pane].innerHTML += `<text><span style="color:${histogramData.color}">${histogramData.value.toFixed(2)}</span>`;
		}
		legends[pane].querySelectorAll('text').forEach(el => {
			el.style.backgroundColor = 'var(--muted-opacity)';
			el.style.padding = '0 5px';
			el.style.borderRadius = '5px';
		});
	});
	return histogramSeries;
}

function addBarSeries(chart, barData, pane, getColor = () => 'green', newLegend = false, legendLabel = '') {
	const barSeries = chart.addSeries(BarSeries, { openVisible: true, thinBars: true }, pane);
	barSeries.setData(
		barData.map((dataPoint, index, array) => ({
			time: dataPoint.time,
			open: 0,
			close: index === array.length - 1 ? dataPoint.value : 0,
			high: dataPoint.value > 0 ? dataPoint.value : 0,
			low: dataPoint.value < 0 ? dataPoint.value : 0,
			color: getColor(dataPoint, index, array),
		}))
	);
	const chartContainer = document.getElementById('chart-container');
	if (legends.length < pane + 1) {
		const legend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;',
		});
		requestAnimationFrame(function checkTable() {
			const table = chartContainer.querySelector('table');
			if (!table || table.children.length < 4) {
				requestAnimationFrame(checkTable);
				return;
			}
			const divsWithCanvas = Array.from(table.children);
			divsWithCanvas.at(2 * pane).style.position = 'relative';
			divsWithCanvas.at(2 * pane).appendChild(legend);
		});
		legend.innerHTML = '';
		legends[pane] = legend;
	}
	chart.subscribeCrosshairMove((param) => {
		const barData = param.seriesData.get(barSeries)
			?? barSeries.data().at(-1)
			?? '—';
		if (newLegend) {
			if (pane > 0) {
				legends[pane].innerHTML = `<text>${legendLabel} <span style="color:${barData.color}">${(barData.low == 0 ? barData.high : barData.low).toFixed(2)}</span>`;
			} else {
				legends[pane].innerHTML += `<br><text>${legendLabel} <span style="color:${barData.color}">${(barData.low == 0 ? barData.high : barData.low).toFixed(2)}</span>`;
			}
		} else {
			legends[pane].innerHTML += `<text><span style="color:${barData.color}">${(barData.low == 0 ? barData.high : barData.low).toFixed(2)}</span>`;
		}
		legends[pane].querySelectorAll('text').forEach(el => {
			el.style.backgroundColor = 'var(--muted-opacity)';
			el.style.padding = '0 5px';
			el.style.borderRadius = '5px';
		});
	});
	return barSeries;
}

function addHorizontalLine(series, value, color = 'blue', label = '', lineWidth = 1, lineStyle = 3) {
	series.createPriceLine({ price: value, color: color, lineWidth: lineWidth, lineStyle: lineStyle, axisLabelVisible: true, title: label });
}

function updateChart(chart) {
	const chartContainer = document.getElementById('chart-container');
	const resizeChart = () => {
		let { width, height } = chartContainer.getBoundingClientRect();
		chart.resize(width, height);
		chartContainer.querySelector('.tv-lightweight-charts').style.width = '100%';
		chartContainer.querySelector('.tv-lightweight-charts').style.height = '100%';
		chartContainer.querySelector('table').style.width = '100%';
		chartContainer.querySelector('table').style.height = '100%';
	};
	const resizeObserver = new ResizeObserver(resizeChart);
	resizeObserver.observe(chartContainer);
	const themeObserver = new MutationObserver(() => {
		document.documentElement.style.setProperty('--muted-opacity', setOpacity(getCssColor('--muted'), 0.6));
		chart.applyOptions(getChartOptions())
	});
	themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	return () => {
		resizeObserver.disconnect();
		themeObserver.disconnect();
		chart.remove();
	};
}

export function CandleChart() {
	const candleData = generateCandleData(500);
	const markers = [
		{
			time: candleData[candleData.length - 2].time,
			position: 'aboveBar',
			color: '#F6465D',
			shape: 'arrowDown',
			text: '@1 -15.34',
		},
		{
			time: candleData[candleData.length - 1].time,
			position: 'belowBar',
			color: '#2EBD85',
			shape: 'arrowUp',
			text: '@2 +15.34',
		}
	];
	const maData = calculateMovingAverageSeriesData(candleData, 20);
	const lineData = generateLineData(500);

	useEffect(() => {
		const chart = createCandleChart(candleData, '#2EBD85', '#F6465D', markers);
		addLineSeries(chart, maData, 0, () => 'blue', 1, 0, true, 'RSI 14');
		addLineSeries(chart, maData, 0, () => 'red', 1, 0, true, 'MA 20');
		addLineSeries(chart, lineData, 0, () => 'green', 1, 0, false);
		addLineSeries(chart, lineData, 1, () => 'purple', 1, 0, true, 'EMA 20');
		const lineSeries = addLineSeries(chart, maData, 1, () => 'green', 1, 0, false);
		addHorizontalLine(lineSeries, 500, 'gray', 'label');
		addHistogramSeries(chart, lineData, 1, (dataPoint) => dataPoint.value > 0 ? 'green' : 'red', false);
		addHistogramSeries(chart, lineData, 2, (dataPoint) => dataPoint.value > 0 ? 'green' : 'red', true, 'MACD 5');
		addBarSeries(chart, lineData, 1, (dataPoint, index, array) => (index === 0 || dataPoint.value >= array[index - 1].value) ? 'green' : 'red', false);
		addBarSeries(chart, lineData, 3, (dataPoint, index, array) => (index === 0 || dataPoint.value >= array[index - 1].value) ? 'green' : 'red', true, 'MACD 5');

		return updateChart(chart);
	}, []);

	return (
		<div id="chart-container" className="size-full"></div>
	)
}