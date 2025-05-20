import { useState, useEffect, useRef } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, BarSeries, CrosshairMode, createSeriesMarkers } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner"
import { Loader2 } from "lucide-react";
import { getTimezoneOffset } from 'date-fns-tz';
import { useSession } from "@/App";
import { Strategy, updateStrategy, Indicator, getIndicator } from "@/api";

interface CandleChartProps {
	readonly candles: Candle[];
	readonly selectedStrategy: Strategy[];
	readonly setSelectedStrategy: React.Dispatch<React.SetStateAction<Strategy | null>>;
	readonly setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

let chart: any;
let candleData = [];
let markers = [];
let displayedIndicators = {};

export function CandleChart({ candles, selectedStrategy, setSelectedStrategy, setIsLoading }: CandleChartProps) {
	const { user } = useSession();
	const [updatingIndicator, setUpdatingIndicator] = useState();
	const pendingIndicatorsRef = useRef(0);
	const selectedStrategyRef = useRef(selectedStrategy);

	function convertDataToTimezone(data: any[], timezone: string, valueKey?: string) {
		return data.map(item => {
			const dateUTC = new Date(item.time);
			const offsetMs = getTimezoneOffset(timezone, dateUTC);
			const adjustedTimestamp = (dateUTC.getTime() + offsetMs) / 1000;
			if (valueKey) {
				return { time: adjustedTimestamp, value: Number(item[valueKey]) };
			}
			return Object.fromEntries(
				Object.entries(item).map(([key, value]) => {
					if (key === 'time') return ['time', adjustedTimestamp];
					const num = Number(value);
					return [key, isNaN(num) ? value : num];
				})
			);
		});
	}

	const getCssColor = (name) => {
		const c = document.createElement('canvas'), x = c.getContext('2d');
		x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		x.fillRect(0, 0, 1, 1);
		c.remove();
		return `rgb(${x.getImageData(0, 0, 1, 1).data.slice(0, 3).join(', ')})`;
	};

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
			timeScale: { borderColor: getCssColor("--border"), timeVisible: true, secondsVisible: false },
			rightPriceScale: { borderColor: getCssColor("--border"), autoScale: true },
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

	function moveUpPane(paneIndex) {
		if (paneIndex === 0) return;
		const oldPaneContainer = chart.panes()[paneIndex].getHTMLElement().children[1].firstElementChild;
		const newPaneContainer = chart.panes()[paneIndex - 1].getHTMLElement().children[1].firstElementChild;
		oldPaneContainer.appendChild(newPaneContainer.querySelector('#legend'));
		newPaneContainer.appendChild(oldPaneContainer.querySelector('#legend'));
		chart.panes()[paneIndex].moveTo(paneIndex - 1);
		chart.panes().forEach((pane, paneIndex) => {
			updateArrowMenu(paneIndex);
		});
	}

	function moveDownPane(paneIndex) {
		if (paneIndex >= chart.panes().length - 1) return;
		const oldPaneContainer = chart.panes()[paneIndex].getHTMLElement().children[1].firstElementChild;
		const newPaneContainer = chart.panes()[paneIndex + 1].getHTMLElement().children[1].firstElementChild;
		oldPaneContainer.appendChild(newPaneContainer.querySelector('#legend'));
		newPaneContainer.appendChild(oldPaneContainer.querySelector('#legend'));
		chart.panes()[paneIndex].moveTo(paneIndex + 1);
		chart.panes().forEach((pane, paneIndex) => {
			updateArrowMenu(paneIndex);
		});
	}

	function updateArrowMenu(paneIndex) {
		const arrowMenuContainer = Object.assign(document.createElement('div'), {
			id: 'arrowMenu',
			style: `position:absolute;right:8px;top:7px;z-index:10;color:var(--foreground);display:flex;justify-content:flex-end;gap:6px;background-color:var(--muted-opacity);padding:0 3px;border-radius:5px;opacity:0.3;`,
		});
		arrowMenuContainer.addEventListener('mouseenter', () => arrowMenuContainer.style.opacity = '1');
		arrowMenuContainer.addEventListener('mouseleave', () => arrowMenuContainer.style.opacity = '0.3');
		const arrowUp = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:var(--foreground);cursor:pointer;`,
		});
		arrowUp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 6.1-.6.8L8 4v8H7V4.1L3.8 6.9 3.2 6l4.3-3.8L11.8 6z"/></svg>';
		arrowUp.addEventListener('click', () => moveUpPane(paneIndex));
		const arrowDown = Object.assign(document.createElement('svg'), {
			style: `position:relative;z-index:10;width:15px;height:15px;color:var(--foreground);cursor:pointer;`,
		});
		arrowDown.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><path fill="currentColor" d="m11.8 8.9-.6-.8L8 11V3H7v7.9L3.8 8.1l-.6.8 4.3 3.8 4.3-3.8z"/></svg>';
		arrowDown.addEventListener('click', () => moveDownPane(paneIndex));
		requestAnimationFrame(() => {
			const pane = chart.panes()[paneIndex];
			if (!pane) return;
			const paneContainer = pane.getHTMLElement().children[1].firstElementChild;
			paneContainer.querySelector('#arrowMenu')?.remove();
			paneContainer.appendChild(arrowMenuContainer);
			if (paneIndex !== 0) arrowMenuContainer.appendChild(arrowUp);
			if (paneIndex < chart.panes().length - 1) arrowMenuContainer.appendChild(arrowDown);
		});
	}

	function hideShowIndicator(indicatorId) {
		displayedIndicators[indicatorId].visible = !displayedIndicators[indicatorId].visible;
		displayedIndicators[indicatorId].series.forEach(series =>
			series.applyOptions({ visible: displayedIndicators[indicatorId].visible })
		);
		displayedIndicators[indicatorId].subLegend.querySelector('#legendMenu').querySelector('#hideIcon').innerHTML = displayedIndicators[indicatorId].visible
			? `<svg id="hideIcon" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
			stroke-width="2" class="lucide lucide-eye" viewBox="0 0 24 24"
			style="position:relative;z-index:10;width:13px;height:13px;color:var(--foreground);cursor:pointer;">
			<path d="M2 12a1 1 0 0 1 0 0 11 11 0 0 1 20 0 1 1 0 0 1 0 0 11 11 0 0 1-20 0"/><circle cx="12" cy="12" r="3"/>
		</svg>`
			: `<svg id="hideIcon" id="hideIcon" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round"
			stroke-linejoin="round" stroke-width="2" class="lucide lucide-eye-closed" viewBox="0 0 24 24"
			style="position:relative;z-index:10;width:13px;height:13px;color:var(--foreground);cursor:pointer;">
			<path d="m15 18-1-3M2 8a11 11 0 0 0 20 0m-2 7-2-2M4 15l2-2m3 5 1-3"/>
		</svg>`;
	}

	function updateIndicator() {
		const original = selectedStrategy.indicators.find(ind => ind.id === updatingIndicator.id);
		if (original && updatingIndicator.params?.some((p, i) => p.value !== original.params?.[i]?.value)) {
			updateStrategy(selectedStrategy.id, { ...selectedStrategy, indicators: JSON.stringify([...selectedStrategy.indicators.filter(ind => ind.id !== updatingIndicator.id), updatingIndicator]) })
				.then((response: StrategyType) => {
					removeIndicator(original.id, false);
					setSelectedStrategy({ ...response.data, indicators: JSON.parse(response.data.indicators ?? '[]') });
				})
				.catch((error) => toast("Failed to update strategy", { description: error.message }))
		}
		setUpdatingIndicator();
	}

	function removeIndicator(indicatorId, deleteFromDb = true) {
		console.log("Eliminando: ", indicatorId);
		let pane;
		try {
			pane = displayedIndicators[indicatorId].series[0].getPane();
		} catch {
			delete displayedIndicators[indicatorId];
			return;
		}
		if (pane.getSeries().some(series => series._internal__series._private__seriesType === "Candlestick")) {
			displayedIndicators[indicatorId].subLegend.remove();
		} else {
			let paneIndex = pane.paneIndex();
			while (paneIndex < chart.panes().length - 1) {
				moveDownPane(paneIndex);
				paneIndex++;
			}
		}

		displayedIndicators[indicatorId].series.forEach(series => {
			chart.removeSeries(series);
		});

		chart.panes().forEach((pane, paneIndex) => {
			updateArrowMenu(paneIndex);
		});

		delete displayedIndicators[indicatorId];

		if (deleteFromDb && selectedStrategy.indicators.some(indicator => indicator.id === indicatorId)) {
			setSelectedStrategy(prev => {
				const newIndicators = prev.indicators.filter(ind => ind.id !== indicatorId);
				updateStrategy(prev.id, { ...prev, indicators: JSON.stringify(newIndicators) })
					.catch(error => toast("Failed to update strategy", { description: error.message }));
				return { ...prev, indicators: newIndicators };
			});
		}
	}

	function createLegend(paneIndex, series, newIndicatorId = null, removeIcon = true) {
		const paneContainer = chart.panes()[paneIndex].getHTMLElement().children[1].firstElementChild;
		let legend = paneContainer.querySelector('#legend');
		if (!legend) {
			paneContainer.style.position = 'relative';
			legend = Object.assign(document.createElement('div'), {
				id: 'legend',
				style: 'position:absolute;left:8px;top:7px;z-index:10;font-size:13px;font-weight:400;pointer-events:none;'
			});
			paneContainer.appendChild(legend);
		}
		let subLegend;
		let legendContent;
		if (newIndicatorId) {
			subLegend = Object.assign(document.createElement('div'), { id: 'subLegend', style: 'display:flex;width:fit-content;pointer-events:auto;' });
			legend.appendChild(subLegend);
			legendContent = Object.assign(document.createElement('div'), { id: 'legendContent' });
			subLegend.appendChild(legendContent);
			const legendMenu = Object.assign(document.createElement('div'), { id: 'legendMenu', style: 'display:flex;gap:6px;padding-top:2px;padding-left:2px;opacity:0.3;' });
			legendMenu.addEventListener('mouseenter', () => legendMenu.style.opacity = '1');
			legendMenu.addEventListener('mouseleave', () => legendMenu.style.opacity = '0.3');
			legendMenu.innerHTML = `
			<svg id="hideIcon" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
				stroke-width="2" class="lucide lucide-eye" viewBox="0 0 24 24"
				style="position:relative;z-index:10;width:13px;height:13px;color:var(--foreground);cursor:pointer;">
				<path d="M2 12a1 1 0 0 1 0 0 11 11 0 0 1 20 0 1 1 0 0 1 0 0 11 11 0 0 1-20 0"/><circle cx="12" cy="12" r="3"/>
			</svg>
			${removeIcon && user?.id === selectedStrategy?.user ? `
			<svg id="updateIcon" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
				stroke-width="2" class="lucide lucide-bolt-icon lucide-bolt" viewBox="0 0 24 24"
				style="position:relative;z-index:10;width:13px;height:13px;color:var(--foreground);cursor:pointer;">
  			<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/>
  			<circle cx="12" cy="12" r="4"/>
			</svg>
			<svg id="removeIcon" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round"
				stroke-linejoin="round" stroke-width="2" class="lucide lucide-trash" viewBox="0 0 24 24"
				style="position:relative;z-index:10;width:13px;height:13px;color:var(--foreground);cursor:pointer;">
				<path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
			</svg>
			` : ''}
		`;
			subLegend.appendChild(legendMenu);
			displayedIndicators[newIndicatorId] = { series, visible: true, subLegend };
			legendMenu.querySelector('#hideIcon')?.addEventListener('click', () => hideShowIndicator(newIndicatorId));
			if (removeIcon) {
				legendMenu.querySelector('#updateIcon')?.addEventListener('click', () => setUpdatingIndicator(JSON.parse(JSON.stringify(selectedStrategyRef.current.indicators.find(ind => ind.id === newIndicatorId)))));
				legendMenu.querySelector('#removeIcon')?.addEventListener('click', () => removeIndicator(newIndicatorId));
			}
		} else {
			let subLegends = legend.querySelectorAll('#subLegend');
			subLegend = subLegends[subLegends.length - 1];
			legendContent = subLegend.querySelector('#legendContent');
			displayedIndicators[Object.keys(displayedIndicators).at(-1)]?.series.push(...series);
		}
		return legendContent;
	}

	function addMarkers() { // meter todo en useEffect de operations
		markers = [
			{ time: candleData[candleData.length - 1].time, position: 'aboveBar', color: '#F6465D', shape: 'arrowDown', text: '@1 -15.34' },
			{ time: candleData[candleData.length - 1].time, position: 'belowBar', color: '#2EBD85', shape: 'arrowUp', text: '@2 +15.34' }
		]
		if (displayedIndicators['candles']?.series?.[0]) {
			createSeriesMarkers(displayedIndicators['candles'].series[0], markers);
		}
	}

	function createCandleChart(candleData, paneIndex, upColor = '#2EBD85', downColor = '#F6465D') {
		if (!document.getElementById('chart-container')) return;
		chart.timeScale().fitContent();
		const candleSeries = chart.addSeries(CandlestickSeries, {
			upColor: upColor,
			downColor: downColor,
			borderVisible: false,
			wickUpColor: upColor,
			wickDownColor: downColor,
			priceFormat: { type: 'custom', minMove: 0.0000000001, formatter: (price) => +price.toFixed(10) },
		});
		candleSeries.setData(candleData);

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

		updateArrowMenu(paneIndex);

		let legend;
		setTimeout(() => {
			legend = createLegend(paneIndex, [candleSeries, volumeSeries], 'candles', false);
			addMarkers();
		}, 0);

		chart.subscribeCrosshairMove((param) => {
			const candleData = param.seriesData.get(candleSeries)
				?? candleSeries.data().at(-1)
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
			setTimeout(() => {
				legend.innerHTML = `
			<span style="background-color: var(--muted-opacity); padding: 0 5px; border-radius: 5px; display: inline-flex; align-items: center; gap: 5px;">
				O <span style="color:${c >= o ? upColor : downColor}">${o}</span> 
				H <span style="color:${c >= o ? upColor : downColor}">${h}</span> 
				L <span style="color:${c >= o ? upColor : downColor}">${l}</span> 
				C <span style="color:${c >= o ? upColor : downColor}">${c} (${change > 0 ? '+' : ''}${change}%)</span> 
				V <span style="color:${c >= o ? upColor : downColor}">${formattedVolume}</span>
			</span>
		`;
			}, 0);
		});
	}

	function addLineSeries(lineData, paneIndex, getColor = () => 'blue', lineWidth = 1, lineStyle = 0, newIndicatorId = null, legendLabel = '') {
		if (!document.getElementById('chart-container')) return;
		const lineSeries = chart.addSeries(LineSeries, { lineWidth: lineWidth, lineStyle: lineStyle, priceFormat: { type: 'custom', minMove: 0.0000000001, formatter: (price) => +price.toFixed(10) } }, paneIndex);
		lineSeries.setData(
			lineData.filter(element => element.value !== undefined).map((dataPoint, index, array) => ({
				...dataPoint,
				color: getColor(dataPoint, index, array)
			}))
		);

		updateArrowMenu(paneIndex);

		let legend;
		const crosshairMoveHandler = (param: any) => {
			if (!chart.panes().some(pane => pane.getSeries().includes(lineSeries))) {
				chart.unsubscribeCrosshairMove(crosshairMoveHandler);
				return;
			}
			if (!legend) return;
			const lineData = param.seriesData.get(lineSeries)
				?? lineSeries.data().at(-1)
				?? '—';
			if (newIndicatorId) legend.innerHTML = '';
			legend.innerHTML += `<span style="background-color: var(--muted-opacity); padding: 0 5px; border-radius: 5px;">${newIndicatorId ? legendLabel + ' ' : ''}<span style="color:${lineData.color}">${+(lineData?.value ?? 0).toFixed(10) || '-'}</span>`;
		};
		requestAnimationFrame(() => {
			legend = createLegend(paneIndex, [lineSeries], newIndicatorId, true);
			chart.subscribeCrosshairMove(crosshairMoveHandler);
		});
	}

	function addHistogramSeries(histogramData, paneIndex, getColor = () => 'green', newIndicatorId = null, legendLabel = '') {
		if (!document.getElementById('chart-container')) return;
		const histogramSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'custom', minMove: 0.0000000001, formatter: (price) => +price.toFixed(10) } }, paneIndex);
		histogramSeries.setData(
			histogramData.filter(element => element.value !== undefined).map((dataPoint, index, array) => ({
				...dataPoint,
				color: getColor(dataPoint, index, array)
			}))
		);

		updateArrowMenu(paneIndex);

		let legend;
		const crosshairMoveHandler = (param: any) => {
			if (!chart.panes().some(pane => pane.getSeries().includes(histogramSeries))) {
				chart.unsubscribeCrosshairMove(crosshairMoveHandler);
				return;
			}
			if (!legend) return;
			const histogramData = param.seriesData.get(histogramSeries)
				?? histogramSeries.data().at(-1)
				?? '—';
			if (newIndicatorId) legend.innerHTML = '';
			legend.innerHTML += `<span style="background-color: var(--muted-opacity); padding: 0 5px; border-radius: 5px;">${newIndicatorId ? legendLabel + ' ' : ''}<span style="color:${histogramData.color}">${+(histogramData?.value ?? 0).toFixed(10) || '-'}</span>`;
		};
		requestAnimationFrame(() => {
			legend = createLegend(paneIndex, [histogramSeries], newIndicatorId, true);
			chart.subscribeCrosshairMove(crosshairMoveHandler);
		});
	}

	function addBarSeries(barData, paneIndex, getColor = () => 'green', newIndicatorId = null, legendLabel = '') {
		if (!document.getElementById('chart-container')) return;
		const barSeries = chart.addSeries(BarSeries, { openVisible: true, thinBars: true, priceFormat: { type: 'custom', minMove: 0.0000000001, formatter: (price) => +price.toFixed(10) } }, paneIndex);
		barSeries.setData(
			barData.filter(element => element.value !== undefined).map((dataPoint, index, array) => ({
				time: dataPoint.time,
				open: 0,
				close: index === array.length - 1 ? dataPoint.value : 0,
				high: dataPoint.value > 0 ? dataPoint.value : 0,
				low: dataPoint.value < 0 ? dataPoint.value : 0,
				color: getColor(dataPoint, index, array),
			}))
		);

		updateArrowMenu(paneIndex);

		let legend;
		const crosshairMoveHandler = (param: any) => {
			if (!chart.panes().some(pane => pane.getSeries().includes(barSeries))) {
				chart.unsubscribeCrosshairMove(crosshairMoveHandler);
				return;
			}
			if (!legend) return;
			const barData = param.seriesData.get(barSeries)
				?? barSeries.data().at(-1)
				?? '—';
			if (newIndicatorId) legend.innerHTML = '';
			legend.innerHTML += `<span style="background-color: var(--muted-opacity); padding: 0 5px; border-radius: 5px;">${newIndicatorId ? legendLabel + ' ' : ''}<span style="color:${barData.color}">${+((barData.low == 0 ? barData.high : barData.low) ?? 0).toFixed(10) || '-'}</span>`;
		};
		requestAnimationFrame(() => {
			legend = createLegend(paneIndex, [barSeries], newIndicatorId, true);
			chart.subscribeCrosshairMove(crosshairMoveHandler);
		});
	}

	function addHorizontalLine(paneIndex, value, color = 'blue', label = '', lineWidth = 1, lineStyle = 3) {
		const pane = chart.panes()[paneIndex];
		const series = pane.getSeries()[0];
		series.createPriceLine({ price: value, color: color, lineWidth: lineWidth, lineStyle: lineStyle, axisLabelVisible: true, title: label });
	}

	function addIndicator(indicator: Indicator) {
		const candlestickPaneIndex = chart.panes().findIndex((pane) => pane.getSeries().some((series) => series._internal__series._private__seriesType === "Candlestick"));
		const newPaneIndex = chart.panes().length;
		const legendLabel = indicator.short_name + ' ' + (indicator.params ?? []).map(param => param.value).join(' ');
		switch (indicator.short_name) {
			case 'RSI':
				addLineSeries(convertDataToTimezone(indicator.data, user.timezone, 'rsi'), newPaneIndex, () => 'violet', 1, 0, indicator.id, legendLabel);
				addHorizontalLine(newPaneIndex, indicator.params.find(p => p.key === 'upper_limit').value, 'grey');
				addHorizontalLine(newPaneIndex, indicator.params.find(p => p.key === 'middle_limit').value, 'grey');
				addHorizontalLine(newPaneIndex, indicator.params.find(p => p.key === 'lower_limit').value, 'grey');
				break;
			case 'SMA':
				addLineSeries(convertDataToTimezone(indicator.data, user.timezone, 'sma'), candlestickPaneIndex, () => 'blue', 1, 0, indicator.id, legendLabel);
				break;
			case 'EMA':
				addLineSeries(convertDataToTimezone(indicator.data, user.timezone, 'ema'), candlestickPaneIndex, () => 'red', 1, 0, indicator.id, legendLabel);
				break;
			case 'BBANDS':
				addLineSeries(convertDataToTimezone(indicator.data, user.timezone, 'upperband'), candlestickPaneIndex, () => 'lightblue', 1, 0, indicator.id, legendLabel);
				addLineSeries(convertDataToTimezone(indicator.data, user.timezone, 'middleband'), candlestickPaneIndex, () => 'orange', 1, 0);
				addLineSeries(convertDataToTimezone(indicator.data, user.timezone, 'lowerband'), candlestickPaneIndex, () => 'lightblue', 1, 0);
				break;
			case 'MACD':
				addHistogramSeries(convertDataToTimezone(indicator.data, user.timezone, 'macdhist'), newPaneIndex, (dataPoint, i, arr) => {
					const v = dataPoint.value, p = arr?.[i - 1]?.value ?? v;
					return v > 0 ? (v > p ? '#2EBD85' : '#ACE5DC') : (v < p ? '#F6465D' : '#FCCBCD');
				}, indicator.id, legendLabel);
				addLineSeries(convertDataToTimezone(indicator.data, user.timezone, 'macd'), newPaneIndex, () => 'blue', 1, 0);
				addLineSeries(convertDataToTimezone(indicator.data, user.timezone, 'macdsignal'), newPaneIndex, () => 'orange', 1, 0);
				break;
			default:
				toast("Indicator type not implemented");
		}
		// addHistogramSeries(maData2, 1, (dataPoint) => dataPoint.value > 0 ? 'green' : 'red', '51bb1126ca', 'MACD 4');
		// addBarSeries(maData2, 2, (dataPoint, index, array) => (index === 0 || dataPoint.value >= array[index - 1].value) ? 'green' : 'red', '7ba4964dda', 'MACD 5');
	}

	function updateChart() {
		const chartContainer = document.getElementById('chart-container');
		chartContainer.style.position = 'relative';
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
			document.documentElement.style.setProperty('--muted-opacity', setOpacity(getCssColor('--muted'), 0.7));
			chart.applyOptions(getChartOptions())
		});
		themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
		return () => {
			resizeObserver.disconnect();
			themeObserver.disconnect();
			chart.remove();
		};
	}

	useEffect(() => {
		const timeout = setTimeout(() => {
			document.documentElement.style.setProperty('--muted-opacity', setOpacity(getCssColor('--muted'), 0.7));
			if (chart) {
				chart.remove();
				displayedIndicators = {};
			}
			chart = createChart(document.getElementById('chart-container'), getChartOptions());
			if (candles.length && user?.timezone) {
				candleData = convertDataToTimezone(candles, user.timezone);
				createCandleChart(candleData, 0, '#2EBD85', '#F6465D');
				return updateChart();
			}
		}, 0);
		return () => clearTimeout(timeout);
	}, [candles, user?.timezone]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			selectedStrategyRef.current = selectedStrategy;
			if (!candles.length || !candleData.length) return;
			if (pendingIndicatorsRef.current !== 0) return;
			console.log('principio del metodo:  ', selectedStrategy.indicators, displayedIndicators);
			const displayedIds = Object.keys(displayedIndicators).filter(id => id !== 'candles');
			const indicatorIds = selectedStrategy.indicators.filter(indicator => indicator.id).map(indicator => indicator.id);
			displayedIds.filter(id => !indicatorIds.includes(id)).forEach(id => removeIndicator(id));
			const missingIndicators = indicatorIds.filter(id => !displayedIds.includes(id));
			if (!missingIndicators.length) return;
			pendingIndicatorsRef.current += missingIndicators.length;
			console.log("Añadido: ", pendingIndicatorsRef.current);
			setIsLoading(true);
			const indicatorsToAdd = [];
			missingIndicators.forEach(id => {
				const indicator = selectedStrategy.indicators.find(ind => ind.id === id);
				if (!indicator) return;
				console.log('antes de getIndicator: ', selectedStrategy.indicators, displayedIndicators);
				getIndicator(selectedStrategy.id, indicator.id, candles[0].time, candles[candles.length - 1].time)
					.then((response: Indicator) => {
						indicatorsToAdd.push((({ data, ...rest }) => rest)(response.data));
						addIndicator(response.data);
						console.log('despues de getIndicator: ', response.data, displayedIndicators);
					})
					.catch((error) => {
						toast("Failed to get indicator", { description: error.message });
					})
					.finally(() => {
						pendingIndicatorsRef.current--;
						console.log("Restado: ", pendingIndicatorsRef.current);
						if (pendingIndicatorsRef.current === 0) {
							console.log("indicatorsToAdd: ", indicatorsToAdd);
							setSelectedStrategy(prev => ({ ...prev, indicators: [...(prev.indicators ?? []).filter(i => !indicatorsToAdd.some(newInd => newInd.id === i.id)), ...indicatorsToAdd] }));
							setIsLoading(false);
							updateChart();
						}
					});
			});
		}, 0);
		return () => clearTimeout(timeout);
	}, [candles, selectedStrategy?.indicators, user?.timezone]);

	return (
		<div id="chart-container" className="flex-1 min-w-0 min-h-0">
			<Dialog open={!!updatingIndicator} onOpenChange={(open) => { if (!open) setUpdatingIndicator(); }}>
				<DialogContent
					className="sm:max-w-[425px]"
					onInteractOutside={(e) => {
						e.preventDefault();
					}}
				>
					<DialogHeader>
						<DialogTitle className="text-2xl">
							<span className="capitalize">{updatingIndicator?.name}</span> ({updatingIndicator?.short_name})
						</DialogTitle>
						<DialogDescription>
							Customize the indicator parameters.
						</DialogDescription>
					</DialogHeader>

					{updatingIndicator?.params?.map((param, i) => (
						<div key={param.key} className="grid grid-cols-[8rem_1fr] items-center w-full gap-4">
							<Label className="capitalize">{param.key.replace('_', ' ')}</Label>
							<Input
								type="number"
								step={1}
								min={0}
								value={isNaN(param.value) ? "" : param.value.toFixed(4).replace(/\.?0+$/, "")}
								onChange={e => {
									const updated = [...(updatingIndicator.params ?? [])];
									updated[i].value = e.target.value === "" ? NaN : isNaN(+e.target.value) ? updated[i].value : +e.target.value;
									setUpdatingIndicator({ ...updatingIndicator, params: updated });
								}}
								onBlur={() => {
									const updated = [...(updatingIndicator.params ?? [])];
									updated[i].value = isNaN(updated[i].value) ? 0 : updated[i].value;
									setUpdatingIndicator({ ...updatingIndicator, params: updated });
								}}
							/>
						</div>
					))}

					<DialogFooter>
						<Button onClick={updateIndicator} disabled={pendingIndicatorsRef.current !== 0} className="w-full">
							{pendingIndicatorsRef.current !== 0 ? (
								<>
									<Loader2 className="animate-spin mr-2" />
									Loading...
								</>
							) : (
								"Save"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div >);
}