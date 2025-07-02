import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Trash } from "lucide-react";
import { DropDownInput } from "./components/dropdown-input";
import { toast } from "sonner";
import { getMarketInfo, startStrategyExecution, stopStrategyExecution, OrderCondition, Order, Condition } from "@/api";
import { useSession } from "@/App";

export function OrderConditions({ selectedStrategy, setStrategyExecutions, selectedStrategyExecution, setSelectedStrategyExecution, loadStrategyExecution, isLoading }) {
	const { user } = useSession();
	const navigate = useNavigate();
	const [baseCurrency, setBaseCurrency] = useState("");
	const [quoteCurrency, setQuoteCurrency] = useState("");
	const [maxLeverage, setMaxLeverage] = useState();
	const [feesLoaded, setFeesLoaded] = useState(false);
	const [makerFee, setMakerFee] = useState(0);
	const [takerFee, setTakerFee] = useState(0);
	const [initialTradableValue, setInitialTradableValue] = useState(0);
	const [leverage, setLeverage] = useState(1);
	const [isRealTrading, setIsRealTrading] = useState(false);
	const [orderConditions, setOrderConditions] = useState<OrderCondition[]>([]);
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
			setInitialTradableValue(+(selectedStrategyExecution?.initial_tradable_value ?? 0));
			setMaxLeverage();
			setLeverage(selectedStrategyExecution?.leverage ?? 1);
			setIsRealTrading(selectedStrategyExecution?.type === "real");
			setOrderConditions((JSON.parse(selectedStrategyExecution?.order_conditions) ?? []));
			setFeesLoaded(false);
		} else {
			getMarketInfo(exchange, symbol)
				.then(response => {
					const marketInfo = response.data;
					setMakerFee(marketInfo.maker_fee ?? 0);
					setTakerFee(marketInfo.taker_fee ?? 0);
					setMaxLeverage(marketInfo.max_leverage ?? undefined);
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
					navigate(`/strategy/${selectedStrategy.id}?execution=${response.data.id}`);
				})
				.catch(error => toast("Failed to start strategy execution", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
		}
	};

	const createEmptyCondition = (): Condition => ({
		start_parenthesis: false,
		left_operand: '',
		operator: '==',
		right_operand: '',
		end_parenthesis: false,
		logical_operator: '',
	});

	const createEmptyOrder = (): Order => ({
		type: 'market',
		side: 'buy',
		price: '',
		amount: '',
	});

	const createEmptyOrderCondition = (): OrderCondition => ({
		conditions: [],
		orders: [],
	});

	return (
		<div className="flex gap-2 mt-1">
			<div className="flex flex-col gap-2 min-w-[370px] ml-4">
				<div className="flex flex-col gap-1">
					<h3 className="text-2xl">Market Params.</h3>
					<p className="text-sm">You can set it yourself if not provided.</p>
					<Separator className="mb-1" />
					<TooltipProvider>
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-1">
								<strong className="mr-1.5">Initial tradable value:</strong>
								<Input
									type="number"
									min={0}
									disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
									value={initialTradableValue}
									onChange={(e) => setInitialTradableValue(e.target.value)}
									className="w-28"
								/>
								<span>{quoteCurrency}</span>
								<Tooltip>
									<TooltipTrigger asChild className="ml-1">
										<Info className="size-3.5 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent>
										<p>Starting funds available for the trading strategy.</p>
									</TooltipContent>
								</Tooltip>
							</div>
							<div className="flex items-center gap-1">
								<strong>Maker Fee:</strong>
								<Input
									type="number"
									step={0.001}
									min={-10}
									max={10}
									disabled={feesLoaded || selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
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
								<Tooltip>
									<TooltipTrigger asChild className="ml-1">
										<Info className="size-3.5 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent>
										<p>Fee charged when you add liquidity by placing a limit order.</p>
									</TooltipContent>
								</Tooltip>
							</div>
							<div className="flex items-center gap-1">
								<strong className="mr-1.5">Taker Fee:</strong>
								<Input
									type="number"
									step={0.001}
									min={-10}
									max={10}
									disabled={feesLoaded || selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
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
								<Tooltip>
									<TooltipTrigger asChild className="ml-1">
										<Info className="size-3.5 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent>
										<p>Fee charged when you remove liquidity by executing a market order.</p>
									</TooltipContent>
								</Tooltip>
							</div>
							{selectedStrategy?.symbol?.includes(':') && (
								<div className="flex items-center gap-3">
									<strong>Leverage:</strong>
									<Input
										type="number"
										step={1}
										min={1}
										max={maxLeverage ?? undefined}
										disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
										value={leverage}
										onChange={(e) => setLeverage(e.target.value)}
										className="w-25"
									/>
									<Tooltip>
										<TooltipTrigger asChild className="ml-1">
											<Info className="size-3.5 text-muted-foreground" />
										</TooltipTrigger>
										<TooltipContent>
											<p>Multiplier that increases your exposure relative to your actual capital.</p>
										</TooltipContent>
									</Tooltip>
								</div>
							)}
						</div>
					</TooltipProvider>
					<div className="mt-2 flex items-center gap-2">
						<Label>Backtest</Label>
						<Switch checked={isRealTrading} onCheckedChange={setIsRealTrading} disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading} />
						<Label className="!opacity-100">Real trading</Label>
						<Button
							onClick={() => isRealTrading ? setIsOpenWarningDialog(true) : handleRunStopExecution()}
							disabled={(selectedStrategyExecution && !selectedStrategyExecution?.running) || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
							variant={isRealTrading ? 'destructive' : 'default'}
							className="w-fit ml-2"
						>
							{selectedStrategyExecution?.running ? 'Stop' : 'Run'}
						</Button>
					</div>
				</div>
			</div>
			<Separator orientation="vertical" className="!h-auto mx-2" />
			<div className="flex flex-col gap-1 w-full">
				<h3 className="text-2xl">Order conditions</h3>
				<p className="text-sm">Define your trading conditions and associated orders to be executed when those conditions are met.</p>
				<Separator className="mb-1" />

				{[...orderConditions, createEmptyOrderCondition()].map((orderCondition, ocIndex, arr) => {
					const isNewOrderCondition = ocIndex === arr.length - 1;
					const updateOrderConditions = (updatedCondition: OrderCondition, isNew: boolean) => {
						const updated = [...orderConditions];
						if (isNew) {
							updated.push(updatedCondition);
						} else {
							updated[ocIndex] = updatedCondition;
						}
						setOrderConditions(updated);
					};

					const handleConditionChange = (index: number, key: keyof Condition, value: any) => {
						const current = isNewOrderCondition ? createEmptyOrderCondition() : { ...orderCondition };
						const conditions = [...current.conditions];
						if (index === conditions.length) {
							conditions.push(createEmptyCondition());
						}
						conditions[index] = { ...conditions[index], [key]: value };
						updateOrderConditions({ ...current, conditions }, isNewOrderCondition);
					};

					const handleOrderChange = (index: number, key: keyof Order, value: any) => {
						const current = isNewOrderCondition ? createEmptyOrderCondition() : { ...orderCondition };
						const orders = [...current.orders];
						if (index === orders.length) {
							orders.push(createEmptyOrder());
						}
						orders[index] = { ...orders[index], [key]: value };
						updateOrderConditions({ ...current, orders }, isNewOrderCondition);
					};

					const removeCondition = (condIndex: number) => {
						const current = { ...orderCondition };
						const conditions = [...current.conditions];
						conditions.splice(condIndex, 1);
						updateOrderConditions({ ...current, conditions }, false);
					};

					const removeOrder = (ordIndex: number) => {
						const current = { ...orderCondition };
						const orders = [...current.orders];
						orders.splice(ordIndex, 1);
						updateOrderConditions({ ...current, orders }, false);
					};

					return !(isNewOrderCondition && selectedStrategyExecution) ? (
						<Card key={ocIndex} className="p-4 mb-2">
							<p className="font-bold">Conditions</p>
							{[...orderCondition.conditions, createEmptyCondition()].map((condition, cIndex, arr) => {
								const isNewCondition = cIndex === arr.length - 1;
								return (
									<div key={cIndex} className="flex items-center gap-2 mb-2">
										{!isNewCondition && !selectedStrategyExecution && user?.id && user?.id === selectedStrategy?.user && (
											<Button
												variant="ghost"
												size="icon"
												className="text-destructive -mx-2"
												onClick={() => removeCondition(cIndex)}
											>
												<Trash className="h-4 w-4" />
											</Button>
										)}

										{!(isNewCondition && selectedStrategyExecution) && (
											<div className="flex items-center gap-2">
												<Button
													disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
													variant={condition.start_parenthesis ? "outline" : "ghost"}
													className={`p-1.5 ${condition.start_parenthesis ? 'border-primary text-primary' : ''}`}
													onClick={() => handleConditionChange(cIndex, 'start_parenthesis', !condition.start_parenthesis)}
												>
													(
												</Button>

												<DropDownInput
													indicators={selectedStrategy?.indicators?.map((indicator) => indicator.short_name + '_' + (indicator.params ?? []).map(param => param.value).join('_')) ?? []}
													disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
													placeholder="Series or numbers"
													value={condition.left_operand}
													onChange={(val) => handleConditionChange(cIndex, 'left_operand', val)}
												/>

												<Select
													value={condition.operator}
													onValueChange={(val) => handleConditionChange(cIndex, 'operator', val)}
												>
													<SelectTrigger className="w-fit" disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}>
														<SelectValue placeholder="Operator" />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															<SelectLabel>Comparison Operators</SelectLabel>
															{['==', '!=', '<', '>', '<=', '>=', 'crossunder', 'crossabove'].map(op => (
																<SelectItem key={op} value={op}>{op}</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>

												<DropDownInput
													indicators={selectedStrategy?.indicators?.map((indicator) => indicator.short_name + '_' + (indicator.params ?? []).map(param => param.value).join('_')) ?? []}
													disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
													placeholder="Series or numbers"
													value={condition.right_operand}
													onChange={(val) => handleConditionChange(cIndex, 'right_operand', val)}
												/>

												<Button
													disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
													variant={condition.end_parenthesis ? "outline" : "ghost"}
													className={`p-1.5 ${condition.end_parenthesis ? 'border-primary text-primary' : ''}`}
													onClick={() => handleConditionChange(cIndex, 'end_parenthesis', !condition.end_parenthesis)}
												>
													)
												</Button>

												<Select
													value={condition.logical_operator || 'none'}
													onValueChange={(val) => handleConditionChange(cIndex, 'logical_operator', val === 'none' ? '' : val)}
												>
													<SelectTrigger className="w-fit" disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}>
														<SelectValue placeholder="Logical" />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															<SelectLabel>Logical Operators</SelectLabel>
															{['and', 'or', 'xor', 'none'].map(op => (
																<SelectItem key={op} value={op}>
																	{op === 'none' ? '\u00A0' : op}
																</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>
											</div>
										)}
									</div>
								)
							})}

							<p className="font-bold mt-4">Orders</p>
							{[...orderCondition.orders, createEmptyOrder()].map((order, oIndex, arr) => {
								const isNewOrder = oIndex === arr.length - 1;
								return (
									<div key={oIndex} className="flex items-center gap-2 mb-2">
										{!isNewOrder && !selectedStrategyExecution && user?.id && user?.id === selectedStrategy?.user && (
											<Button
												variant="ghost"
												size="icon"
												className="text-destructive -mx-2"
												onClick={() => removeOrder(oIndex)}
											>
												<Trash className="h-4 w-4" />
											</Button>
										)}
										{!(isNewOrder && selectedStrategyExecution) && (
											<div className="flex items-center gap-2">
												<Select
													value={order.type}
													onValueChange={(val) => handleOrderChange(oIndex, 'type', val)}
												>
													<SelectTrigger className="w-fit" disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}>
														<SelectValue placeholder="Type" />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															<SelectLabel>Order Type</SelectLabel>
															<SelectItem value="market">market</SelectItem>
															<SelectItem value="limit">limit</SelectItem>
															<SelectItem value="cancel_all_open_orders">cancel all open orders</SelectItem>
														</SelectGroup>
													</SelectContent>
												</Select>

												{(order.type === 'limit' || order.type === 'market') && (
													<div className="flex gap-2">
														<Select
															value={order.side}
															onValueChange={(val) => handleOrderChange(oIndex, 'side', val)}
														>
															<SelectTrigger className="w-fit" disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}>
																<SelectValue placeholder="Side" />
															</SelectTrigger>
															<SelectContent>
																<SelectGroup>
																	<SelectLabel>Order Side</SelectLabel>
																	<SelectItem value="buy">buy</SelectItem>
																	<SelectItem value="sell">sell</SelectItem>
																</SelectGroup>
															</SelectContent>
														</Select>

														<DropDownInput
															indicators={selectedStrategy?.indicators?.map((indicator) => indicator.short_name + '_' + (indicator.params ?? []).map(param => param.value).join('_')) ?? []}
															disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
															placeholder="Amount"
															value={order.amount}
															onChange={(val) => handleOrderChange(oIndex, 'amount', val)}
														/>

														{order.type === 'limit' && (
															<DropDownInput
																indicators={selectedStrategy?.indicators?.map((indicator) => indicator.short_name + '_' + (indicator.params ?? []).map(param => param.value).join('_')) ?? []}
																disabled={selectedStrategyExecution || !user?.id || user?.id !== selectedStrategy?.user || isLoading}
																placeholder="Price"
																value={order.price}
																onChange={(val) => handleOrderChange(oIndex, 'price', val)}
															/>
														)}
													</div>
												)}
											</div>
										)}
									</div>
								)
							})}
							{!isNewOrderCondition && !selectedStrategyExecution && user?.id && user?.id === selectedStrategy?.user && (
								<div className="mt-4">
									<Button
										variant="destructive"
										onClick={() => {
											const updated = [...orderConditions];
											updated.splice(ocIndex, 1);
											setOrderConditions(updated);
										}}
									>
										Delete condition-order block
									</Button>
								</div>
							)}
						</Card>
					) : null;
				})}

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
