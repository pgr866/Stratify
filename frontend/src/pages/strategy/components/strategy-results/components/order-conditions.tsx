import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { getMarketInfo } from "@/api";

export function OrderConditions({ selectedStrategy, selectedStrategyExecution, setSelectedStrategyExecution }) {
	const [makerFee, setMakerFee] = useState("");
	const [takerFee, setTakerFee] = useState("");
	const [maxLeverage, setMaxLeverage] = useState("");
	const [minOrderAmount, setMinOrderAmount] = useState("");
	const [maxOrderAmount, setMaxOrderAmount] = useState("");
	const [amountPrecision, setAmountPrecision] = useState("");
	const [pricePrecision, setPricePrecision] = useState("");

	useEffect(() => {
		const exchange = selectedStrategyExecution?.exchange ?? selectedStrategy?.exchange;
		const symbol = selectedStrategyExecution?.symbol ?? selectedStrategy?.symbol;
		if (!exchange || !symbol) return;
		getMarketInfo(exchange, symbol)
			.then(response => {
				const marketInfo = response.data;
				setMakerFee(marketInfo.maker_fee?.toString() ?? "0");
				setTakerFee(marketInfo.taker_fee.toString() ?? "0");
				setMaxLeverage(marketInfo.max_leverage?.toString() ?? "");
				setMinOrderAmount(marketInfo.min_order_amount?.toString() ?? "");
				setMaxOrderAmount(marketInfo.max_order_amount?.toString() ?? "");
				setAmountPrecision(marketInfo.amount_precision?.toString() ?? "");
				setPricePrecision(marketInfo.price_precision?.toString() ?? "");
			})
			.catch(error => toast("Failed to fetch market info", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
		// .finally(() => setIsLoadingResults(false));
	}, [selectedStrategy?.exchange, selectedStrategy?.symbol]);

	return (
		<div>
			<h2>Order Conditions</h2>
			<p><strong>Maker Fee:</strong> {makerFee}</p>
			<p><strong>Taker Fee:</strong> {takerFee}</p>
			<p><strong>Max Leverage:</strong> {maxLeverage}</p>
			<p><strong>Min Order Amount:</strong> {minOrderAmount}</p>
			<p><strong>Max Order Amount:</strong> {maxOrderAmount}</p>
			<p><strong>Precision Amount:</strong> {amountPrecision}</p>
			<p><strong>Precision Price:</strong> {pricePrecision}</p>
		</div>
	)
}
