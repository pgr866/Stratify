import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getMarketInfo, startStrategyExecution, stopStrategyExecution } from "@/api";
import { useSession } from "@/App";

export function OrderConditions({ selectedStrategy, setStrategyExecutions, selectedStrategyExecution, setSelectedStrategyExecution, loadStrategyExecution }) {
	const { user } = useSession();
	const [baseCurrency, setBaseCurrency] = useState("");
	const [quoteCurrency, setQuoteCurrency] = useState("");
	const [maxLeverage, setMaxLeverage] = useState();
	const [feesLoaded, setFeesLoaded] = useState(false);
	const [makerFee, setMakerFee] = useState(0);
	const [takerFee, setTakerFee] = useState(0);
	const [initialTradableValue, setInitialTradableValue] = useState(0);
	const [leverage, setLeverage] = useState(1);
	const [isRealTrading, setIsRealTrading] = useState(false);
	const [orderConditions, setOrderConditions] = useState([]);
	const [isOpenWarningDialog, setIsOpenWarningDialog] = useState(false);

	useEffect(() => {
		if (selectedStrategyExecution?.type === "real") {
			setIsRealTrading(true);
		}
		const exchange = selectedStrategy?.exchange;
		const symbol = selectedStrategy?.symbol;
		if (!exchange || !symbol) return;
		const parts = symbol?.split(/[:/]/);
		setBaseCurrency(parts?.[0]);
		setQuoteCurrency(parts?.[parts.length - 1]);
		if (selectedStrategyExecution) {
			setMakerFee(selectedStrategyExecution.maker_fee ?? 0);
			setTakerFee(selectedStrategyExecution.taker_fee ?? 0);
			setInitialTradableValue(+selectedStrategyExecution?.initial_tradable_value ?? 0);
			setMaxLeverage();
			setLeverage(selectedStrategyExecution?.leverage ?? 1);
			setIsRealTrading(selectedStrategyExecution?.type === "real");
			setFeesLoaded(false);
		} else {
			getMarketInfo(exchange, symbol)
				.then(response => {
					const marketInfo = response.data;
					setMakerFee(marketInfo.maker_fee ?? 0);
					setTakerFee(marketInfo.taker_fee ?? 0);
					setInitialTradableValue(0);
					setMaxLeverage(marketInfo.max_leverage ?? undefined);
					setLeverage(1);
					setIsRealTrading(false);
					if (marketInfo.maker_fee && marketInfo.taker_fee) {
						setFeesLoaded(true);
					}
				})
				.catch(error => toast("Failed to fetch market info", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
		}
	}, [selectedStrategyExecution?.id, selectedStrategy?.exchange, selectedStrategy?.symbol]);

	const handleRunStopExecution = () => {
		setIsOpenWarningDialog(false);
		if (selectedStrategyExecution?.running) {
			stopStrategyExecution(selectedStrategyExecution?.id)
				.then((response) => {
					setSelectedStrategyExecution(response.data);
					toast("Strategy execution stopped successfully");
				})
				.catch(error => toast("Failed to stop strategy execution", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
		} else {
			startStrategyExecution(selectedStrategy.id, makerFee, takerFee, initialTradableValue, leverage, isRealTrading ? 'real' : 'backtest', JSON.stringify(orderConditions))
				.then((response) => {
					loadStrategyExecution(response.data.id);
					setStrategyExecutions(prev => [response.data, ...prev]);
					toast("Strategy execution started successfully");
				})
				.catch(error => toast("Failed to start strategy execution", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
		}
	};

	return (
		<div className="flex gap-2 mt-1">
			<div className="flex flex-col gap-2 min-w-[360px]">
				<div className="flex flex-col gap-1">
					<h3 className="text-2xl">Market Params.</h3>
					<p className="text-sm">You can set it yourself if not provided.</p>
					<Separator className="mb-1" />
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-1">
							<strong className="mr-1.5">Initial tradable value:</strong>
							<Input
								type="number"
								min={0}
								disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user}
								value={initialTradableValue}
								onChange={(e) => setInitialTradableValue(e.target.value)}
								className="w-32"
							/>
							<span>{quoteCurrency}</span>
						</div>
						<div className="flex items-center gap-1">
							<strong>Maker Fee:</strong>
							<Input
								type="number"
								step={0.001}
								min={-10}
								max={10}
								disabled={feesLoaded || selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user}
								value={Number((makerFee * 100).toFixed(3))}
								onChange={(e) => {
									const parsed = parseFloat(e.target.value);
									if (!isNaN(parsed)) {
										setMakerFee(parsed / 100);
									}
								}}
								className="w-25"
							/>
							<span>%</span>
						</div>
						<div className="flex items-center gap-1">
							<strong className="mr-1.5">Taker Fee:</strong>
							<Input
								type="number"
								step={0.001}
								min={-10}
								max={10}
								disabled={feesLoaded || selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user}
								value={Number((takerFee * 100).toFixed(3))}
								onChange={(e) => {
									const parsed = parseFloat(e.target.value);
									if (!isNaN(parsed)) {
										setTakerFee(parsed / 100);
									}
								}}
								className="w-25"
							/>
							<span>%</span>
						</div>
						{selectedStrategy?.symbol?.includes(':') && (
							<div className="flex items-center gap-3">
								<strong>Leverage:</strong>
								<Input
									type="number"
									step={1}
									min={1}
									max={maxLeverage ?? undefined}
									disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user}
									value={leverage}
									onChange={(e) => setLeverage(e.target.value)}
									className="w-25"
								/>
							</div>
						)}
					</div>
					<div className="mt-2 flex items-center gap-2">
						<Label>Backtest</Label>
						<Switch checked={isRealTrading} onCheckedChange={setIsRealTrading} disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user} />
						<Label className="!opacity-100">Real trading</Label>
						<Button
							onClick={() => isRealTrading ? setIsOpenWarningDialog(true) : handleRunStopExecution()}
							disabled={(selectedStrategyExecution && !selectedStrategyExecution?.running) || !user?.id || user?.id !== selectedStrategy?.user}
							className="w-fit ml-2"
						>
							{selectedStrategyExecution?.running ? 'Stop' : 'Run'}
						</Button>
					</div>
				</div>
			</div>
			<Separator orientation="vertical" className="!h-auto" />
			<div className="flex flex-col gap-1 w-full">
				<h3 className="text-2xl">Order conditions</h3>
				<p className="text-sm">Define your trading conditions and associated orders to be executed when those conditions are met.</p>
				<Separator className="mb-1" />
			</div>
			<Dialog open={isOpenWarningDialog} onOpenChange={() => setIsOpenWarningDialog(false)}>
				<DialogContent
					className="sm:max-w-[425px]"
					onInteractOutside={(e) => {
						e.preventDefault();
					}}
				>
					<DialogHeader>
						<DialogTitle className="text-2xl">
							Confirm {!selectedStrategyExecution?.running ? 'execution' : 'stopping'} in real trading mode
						</DialogTitle>
						<DialogDescription>
							<strong>Are you sure you want to {!selectedStrategyExecution?.running ? 'run' : 'stop'} this strategy in real trading mode?</strong><br />
							This will {!selectedStrategyExecution?.running ? 'execute' : 'halt'} orders using your real capital and cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="destructive" onClick={handleRunStopExecution} className="w-full">
							{!selectedStrategyExecution?.running ? 'Run Strategy in Real Trading' : 'Stop Strategy in Real Trading'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
