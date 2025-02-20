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

let legends = [];
let chart: any;

function createCandleChart(candleData, paneIndex, upColor = '#2EBD85', downColor = '#F6465D', markers = []) {
	const chartContainer = document.getElementById('chart-container');
	if (!chartContainer) return;
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
	if (legends.length < paneIndex + 1) {
		const legend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;',
		});
		const menuContainer = Object.assign(document.createElement('span'), {
			style: `position:absolute;right:8px;top:7px;z-index:10;width:43px;height:15px;color:${getCssColor('--foreground')};display:flex;justify-content:flex-end;`,
		});
		const arrowUp = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		arrowUp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 6.1-.6.8L8 4v8H7V4.1L3.8 6.9 3.2 6l4.3-3.8L11.8 6z"/></svg>';
		arrowUp.addEventListener('click', () => moveUpPane(paneIndex));
		const arrowDown = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		arrowDown.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 8.9-.6-.8L8 11V3H7v7.9L3.8 8.1l-.6.8 4.3 3.8 4.3-3.8z"/></svg>';
		arrowDown.addEventListener('click', () => moveDownPane(paneIndex));
		setTimeout(() => {
			const paneContainer = chartContainer.firstElementChild.firstElementChild.children[2 * paneIndex].children[1].firstElementChild;
			paneContainer.style.position = 'relative';
			paneContainer.appendChild(legend);
			paneContainer.appendChild(menuContainer);
			if (paneIndex !== 0) menuContainer.appendChild(arrowUp);
			if (paneIndex < chart.panes().length - 1) menuContainer.appendChild(arrowDown);
		}, 0);
		legend.innerHTML = '';
		legends[paneIndex] = legend;
	}
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
		legends[paneIndex].innerHTML = `
		<text>
		O <span style="color:${c >= o ? upColor : downColor}">${o}</span> 
		H <span style="color:${c >= o ? upColor : downColor}">${h}</span> 
		L <span style="color:${c >= o ? upColor : downColor}">${l}</span> 
		C <span style="color:${c >= o ? upColor : downColor}">${c} (${change > 0 ? '+' : ''}${change}%)</span> 
		V <span style="color:${c >= o ? upColor : downColor}">${formattedVolume}</span>
		`;
		legends[paneIndex].querySelectorAll('text').forEach(el => {
			el.style.backgroundColor = 'var(--muted-opacity)';
			el.style.padding = '0 5px';
			el.style.borderRadius = '5px';
		});
	});
}

function addLineSeries(lineData, paneIndex, getColor = () => 'blue', lineWidth = 1, lineStyle = 0, newLegend = true, legendLabel = '') {
	const chartContainer = document.getElementById('chart-container');
	if (!chartContainer) return;
	const lineSeries = chart.addSeries(LineSeries, { lineWidth: lineWidth, lineStyle: lineStyle }, paneIndex);
	lineSeries.setData(
		lineData.map((dataPoint, index, array) => ({
			...dataPoint,
			color: getColor(dataPoint, index, array)
		}))
	);
	if (legends.length < paneIndex + 1) {
		const legend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;',
		});
		const menuContainer = Object.assign(document.createElement('span'), {
			style: `position:absolute;right:8px;top:7px;z-index:10;width:43px;height:15px;color:${getCssColor('--foreground')};display:flex;justify-content:flex-end;`,
		});
		const arrowUp = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		arrowUp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 6.1-.6.8L8 4v8H7V4.1L3.8 6.9 3.2 6l4.3-3.8L11.8 6z"/></svg>';
		arrowUp.addEventListener('click', () => moveUpPane(paneIndex));
		const arrowDown = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		arrowDown.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 8.9-.6-.8L8 11V3H7v7.9L3.8 8.1l-.6.8 4.3 3.8 4.3-3.8z"/></svg>';
		arrowDown.addEventListener('click', () => moveDownPane(paneIndex));
		const remove = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="lucide lucide-trash" viewBox="0 0 24 24"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
		remove.addEventListener('click', () => removePane(paneIndex));
		setTimeout(() => {
			const paneContainer = chartContainer.firstElementChild.firstElementChild.children[2 * paneIndex].children[1].firstElementChild;
			paneContainer.style.position = 'relative';
			paneContainer.appendChild(legend);
			paneContainer.appendChild(menuContainer);
			if (paneIndex !== 0) menuContainer.appendChild(arrowUp);
			if (paneIndex < chart.panes().length - 1) menuContainer.appendChild(arrowDown);
			menuContainer.appendChild(remove);
		}, 0);
		legend.innerHTML = '';
		legends[paneIndex] = legend;
	}
	const crosshairMoveHandler = (param: any) => {
		if (!chart.panes().some(pane => pane.getSeries().includes(lineSeries))) {
			chart.unsubscribeCrosshairMove(crosshairMoveHandler);
			return;
		}
		const lineData = param.seriesData.get(lineSeries)
			?? lineSeries.data().at(-1)
			?? '—';
		if (newLegend) {
			if (paneIndex > 0) {
				legends[paneIndex].innerHTML = `<text>${legendLabel} <span style="color:${lineData.color}">${lineData.value.toFixed(2)}</span>`;
			} else {
				legends[paneIndex].innerHTML += `<br><text>${legendLabel} <span style="color:${lineData.color}">${lineData.value.toFixed(2)}</span>`;
			}
		} else {
			legends[paneIndex].innerHTML += `<text><span style="color:${lineData.color}">${lineData.value.toFixed(2)}</span>`;
		}
		legends[paneIndex].querySelectorAll('text').forEach(el => {
			el.style.backgroundColor = 'var(--muted-opacity)';
			el.style.padding = '0 5px';
			el.style.borderRadius = '5px';
		});
	};
	chart.subscribeCrosshairMove(crosshairMoveHandler);
	return lineSeries;
}

function addHistogramSeries(histogramData, paneIndex, getColor = () => 'green', newLegend = true, legendLabel = '') {
	const chartContainer = document.getElementById('chart-container');
	if (!chartContainer) return;
	const histogramSeries = chart.addSeries(HistogramSeries, {}, paneIndex);
	histogramSeries.setData(
		histogramData.map((dataPoint, index, array) => ({
			...dataPoint,
			color: getColor(dataPoint, index, array)
		}))
	);
	if (legends.length < paneIndex + 1) {
		const legend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;',
		});
		const menuContainer = Object.assign(document.createElement('span'), {
			style: `position:absolute;right:8px;top:7px;z-index:10;width:43px;height:15px;color:${getCssColor('--foreground')};display:flex;justify-content:flex-end;`,
		});
		const arrowUp = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		arrowUp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 6.1-.6.8L8 4v8H7V4.1L3.8 6.9 3.2 6l4.3-3.8L11.8 6z"/></svg>';
		arrowUp.addEventListener('click', () => moveUpPane(paneIndex));
		const arrowDown = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		arrowDown.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 8.9-.6-.8L8 11V3H7v7.9L3.8 8.1l-.6.8 4.3 3.8 4.3-3.8z"/></svg>';
		arrowDown.addEventListener('click', () => moveDownPane(paneIndex));
		const remove = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="lucide lucide-trash" viewBox="0 0 24 24"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
		remove.addEventListener('click', () => removePane(paneIndex));
		setTimeout(() => {
			const paneContainer = chartContainer.firstElementChild.firstElementChild.children[2 * paneIndex].children[1].firstElementChild;
			paneContainer.style.position = 'relative';
			paneContainer.appendChild(legend);
			paneContainer.appendChild(menuContainer);
			if (paneIndex !== 0) menuContainer.appendChild(arrowUp);
			if (paneIndex < chart.panes().length - 1) menuContainer.appendChild(arrowDown);
			menuContainer.appendChild(remove);
		}, 0);
		legend.innerHTML = '';
		legends[paneIndex] = legend;
	}
	const crosshairMoveHandler = (param: any) => {
		if (!chart.panes().some(pane => pane.getSeries().includes(histogramSeries))) {
			chart.unsubscribeCrosshairMove(crosshairMoveHandler);
			return;
		}
		const histogramData = param.seriesData.get(histogramSeries)
			?? histogramSeries.data().at(-1)
			?? '—';
		if (newLegend) {
			if (paneIndex > 0) {
				legends[paneIndex].innerHTML = `<text>${legendLabel} <span style="color:${histogramData.color}">${histogramData.value.toFixed(2)}</span>`;
			} else {
				legends[paneIndex].innerHTML += `<br><text>${legendLabel} <span style="color:${histogramData.color}">${histogramData.value.toFixed(2)}</span>`;
			}
		} else {
			legends[paneIndex].innerHTML += `<text><span style="color:${histogramData.color}">${histogramData.value.toFixed(2)}</span>`;
		}
		legends[paneIndex].querySelectorAll('text').forEach(el => {
			el.style.backgroundColor = 'var(--muted-opacity)';
			el.style.padding = '0 5px';
			el.style.borderRadius = '5px';
		});
	};
	chart.subscribeCrosshairMove(crosshairMoveHandler);
	return histogramSeries;
}

function addBarSeries(barData, paneIndex, getColor = () => 'green', newLegend = true, legendLabel = '') {
	const chartContainer = document.getElementById('chart-container');
	if (!chartContainer) return;
	const barSeries = chart.addSeries(BarSeries, { openVisible: true, thinBars: true }, paneIndex);
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
	if (legends.length < paneIndex + 1) {
		const legend = Object.assign(document.createElement('div'), {
			style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;',
		});
		const menuContainer = Object.assign(document.createElement('span'), {
			style: `position:absolute;right:8px;top:7px;z-index:10;width:43px;height:15px;color:${getCssColor('--foreground')};display:flex;justify-content:flex-end;`,
		});
		const arrowUp = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		arrowUp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 6.1-.6.8L8 4v8H7V4.1L3.8 6.9 3.2 6l4.3-3.8L11.8 6z"/></svg>';
		arrowUp.addEventListener('click', () => moveUpPane(paneIndex));
		const arrowDown = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		arrowDown.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 8.9-.6-.8L8 11V3H7v7.9L3.8 8.1l-.6.8 4.3 3.8 4.3-3.8z"/></svg>';
		arrowDown.addEventListener('click', () => moveDownPane(paneIndex));
		const remove = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:${getCssColor('--foreground')};`,
		});
		remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="lucide lucide-trash" viewBox="0 0 24 24"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
		remove.addEventListener('click', () => removePane(paneIndex));
		setTimeout(() => {
			const paneContainer = chartContainer.firstElementChild.firstElementChild.children[2 * paneIndex].children[1].firstElementChild;
			paneContainer.style.position = 'relative';
			paneContainer.appendChild(legend);
			paneContainer.appendChild(menuContainer);
			if (paneIndex !== 0) menuContainer.appendChild(arrowUp);
			if (paneIndex < chart.panes().length - 1) menuContainer.appendChild(arrowDown);
			menuContainer.appendChild(remove);
		}, 0);
		legend.innerHTML = '';
		legends[paneIndex] = legend;
	}
	const crosshairMoveHandler = (param: any) => {
		if (!chart.panes().some(pane => pane.getSeries().includes(barSeries))) {
			chart.unsubscribeCrosshairMove(crosshairMoveHandler);
			return;
		}
		const barData = param.seriesData.get(barSeries)
			?? barSeries.data().at(-1)
			?? '—';
		if (newLegend) {
			if (paneIndex > 0) {
				legends[paneIndex].innerHTML = `<text>${legendLabel} <span style="color:${barData.color}">${(barData.low == 0 ? barData.high : barData.low).toFixed(2)}</span>`;
			} else {
				legends[paneIndex].innerHTML += `<br><text>${legendLabel} <span style="color:${barData.color}">${(barData.low == 0 ? barData.high : barData.low).toFixed(2)}</span>`;
			}
		} else {
			legends[paneIndex].innerHTML += `<text><span style="color:${barData.color}">${(barData.low == 0 ? barData.high : barData.low).toFixed(2)}</span>`;
		}
		legends[paneIndex].querySelectorAll('text').forEach(el => {
			el.style.backgroundColor = 'var(--muted-opacity)';
			el.style.padding = '0 5px';
			el.style.borderRadius = '5px';
		});
	};
	chart.subscribeCrosshairMove(crosshairMoveHandler);
	return barSeries;
}

function addHorizontalLine(series, value, color = 'blue', label = '', lineWidth = 1, lineStyle = 3) {
	series.createPriceLine({ price: value, color: color, lineWidth: lineWidth, lineStyle: lineStyle, axisLabelVisible: true, title: label });
}

function updateChart() {
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

function moveUpPane(paneIndex) {
	if (paneIndex === 0) return;
	const chartContainer = document.getElementById('chart-container');
	const oldPaneContainer = chartContainer.firstElementChild.firstElementChild.children[2 * paneIndex].children[1].firstElementChild;
	const newPaneContainer = chartContainer.firstElementChild.firstElementChild.children[2 * (paneIndex - 1)].children[1].firstElementChild;
	oldPaneContainer.appendChild(newPaneContainer.querySelector("div"));
	newPaneContainer.appendChild(oldPaneContainer.querySelector("div"));
	chart.panes()[paneIndex].moveTo(paneIndex - 1);
}

function moveDownPane(paneIndex) {
	if (paneIndex >= chart.panes().length - 1) return;
	const chartContainer = document.getElementById('chart-container');
	const oldPaneContainer = chartContainer.firstElementChild.firstElementChild.children[2 * paneIndex].children[1].firstElementChild;
	const newPaneContainer = chartContainer.firstElementChild.firstElementChild.children[2 * (paneIndex + 1)].children[1].firstElementChild;
	oldPaneContainer.appendChild(newPaneContainer.querySelector("div"));
	newPaneContainer.appendChild(oldPaneContainer.querySelector("div"));
	chart.panes()[paneIndex].moveTo(paneIndex + 1);
}

function removePane(paneIndex) {
	chart.panes()[paneIndex].getSeries().forEach(series => {
		chart.removeSeries(series);
	});
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
		chart = createChart(document.getElementById('chart-container'), getChartOptions());
		createCandleChart(candleData, 0, '#2EBD85', '#F6465D', markers);
		addLineSeries(maData, 0, () => 'blue', 1, 0, true, 'RSI 14');
		addLineSeries(maData, 0, () => 'red', 1, 0, true, 'MA 20');
		addLineSeries(lineData, 0, () => 'green', 1, 0, false);
		addLineSeries(lineData, 1, () => 'purple', 1, 0, true, 'EMA 20');
		const lineSeries = addLineSeries(maData, 1, () => 'green', 1, 0, false);
		addHorizontalLine(lineSeries, 500, 'gray', 'label');
		addHistogramSeries(lineData, 1, (dataPoint) => dataPoint.value > 0 ? 'green' : 'red', false);
		addBarSeries(lineData, 1, (dataPoint, index, array) => (index === 0 || dataPoint.value >= array[index - 1].value) ? 'green' : 'red', false);
		addBarSeries(lineData, 2, (dataPoint, index, array) => (index === 0 || dataPoint.value >= array[index - 1].value) ? 'green' : 'red', true, 'MACD 5');

		return updateChart();
	}, []);

	return (
		<div id="chart-container" className="size-full"></div>
	)
}