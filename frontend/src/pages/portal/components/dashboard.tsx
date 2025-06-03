import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ResultsChart } from "@/components/results-chart"
import { DateTimeRangePicker } from "@/components/date-time-range-picker";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { toast } from "sonner"
import { Info, TrendingUp, Coins, CircleCheck, Calculator, Divide } from "lucide-react";
import { useSession } from "@/App";
import { DashboardStats, getDashboardStats } from "@/api";

export function Dashboard() {
	const { user, setUser } = useSession();
	const [selectedDatetimeRange, setSelectedDatetimeRange] = useState({ from: Date.now() - 604800000, to: Date.now() });
	const [isLoading, setIsLoading] = useState(false);
	const [dashboardStats, setDashboardStats] = useState<DashboardStats>({});

	useEffect(() => {
		if (!user) return;
		setIsLoading(true);
		getDashboardStats(selectedDatetimeRange.from, selectedDatetimeRange.to, user.dashboard_real_trading)
			.then((response: DashboardStats) => setDashboardStats(response.data))
			.catch((error) => toast("Failed to get Dashboard Stats", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
			.finally(() => setIsLoading(false));
	}, [selectedDatetimeRange, user?.dashboard_real_trading]);

	return (
		<div className="flex-1 space-y-4">
			<div className="flex items-center gap-4">
				<DateTimeRangePicker variant={"outline"} size={"sm"} width={"320px"}
					timezone={user.timezone}
					range={selectedDatetimeRange}
					onChange={(newRange) => {
						setSelectedDatetimeRange(newRange);
					}}
					disabled={isLoading}
				/>
				<div className="flex gap-2">
					<Label>Backtest</Label>
					<Switch checked={user?.dashboard_real_trading} onCheckedChange={(val) => setUser({ ...user, dashboard_real_trading: val })} disabled={isLoading} />
					<Label className="!opacity-100">Real trading</Label>
				</div>
			</div>
			<TooltipProvider>
				<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium flex items-center gap-1">
								Total Net Profit
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="size-3.5 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent>
										<p>The overall profit or loss achieved.</p>
									</TooltipContent>
								</Tooltip>
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent className="text-2xl font-bold">
							<div className={dashboardStats?.total_net_profit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}>
								{dashboardStats?.total_net_profit != null ? `${dashboardStats?.total_net_profit > 0 ? '+' : ''}${(+dashboardStats?.total_net_profit)?.toFixed(2)}` : '-'}%
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium flex items-center gap-1">
								Total Closed Trades
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="size-3.5 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent>
										<p className="leading-snug">The total number of closed trades,<br />winning and losing.</p>
									</TooltipContent>
								</Tooltip>
							</CardTitle>
							<Coins className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{dashboardStats?.total_closed_trades ?? 0}</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium flex items-center gap-1">
								Winning Trade Rate
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="size-3.5 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent>
										<p className="leading-snug">The percentage of winning trades, the number of<br />winning trades divided by the total number of<br />closed trades.</p>
									</TooltipContent>
								</Tooltip>
							</CardTitle>
							<CircleCheck className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent className="text-2xl font-bold">
							<div className={dashboardStats?.winning_trade_rate >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}>
								{dashboardStats?.winning_trade_rate != null ? `${dashboardStats?.winning_trade_rate > 0 ? '+' : ''}${(+dashboardStats?.winning_trade_rate)?.toFixed(2)}` : '-'}%
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="text-sm font-medium flex items-center gap-1">
								Profit Factor
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="size-3.5 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent>
										<p className="leading-snug">The amount of money made for every<br />unit of money it lost, gross profits divided<br />by gross loses.</p>
									</TooltipContent>
								</Tooltip>
							</CardTitle>
							<Calculator className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent className="text-2xl font-bold">
							<div className={dashboardStats?.profit_factor >= 1 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}>
								{dashboardStats?.profit_factor != null ? (+dashboardStats?.profit_factor)?.toFixed(3) : '-'}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium flex items-center gap-1">
								Avg. Trade Profit
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="size-3.5 text-muted-foreground" />
									</TooltipTrigger>
									<TooltipContent>
										<p className="leading-snug">The average profit or loss per trade,<br />calculated by dividing net profit by the<br />number of closed trades.</p>
									</TooltipContent>
								</Tooltip>
							</CardTitle>
							<Divide className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent className="text-2xl font-bold">
							<div className={dashboardStats?.avg_trade_profit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}>
								{dashboardStats?.avg_trade_profit != null ? `${dashboardStats?.avg_trade_profit > 0 ? '+' : ''}${(+dashboardStats?.avg_trade_profit)?.toFixed(2)}` : '-'}%
							</div>
						</CardContent>
					</Card>
				</div>
			</TooltipProvider>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				<Card className="col-span-4 h-[400px] overflow-hidden flex flex-col pb-3">
					<CardTitle className="pl-4 pb-4">Net Profit Accumulation by Trade</CardTitle>
					<CardContent className="pl-2 h-full flex flex-col">
						<ResultsChart
							relCumProfit={dashboardStats?.rel_cum_profit ?? []}
						/>
					</CardContent>
				</Card>
				<Card className="col-span-4 lg:col-span-3">
					<CardHeader>
						<CardTitle>Recent Trades</CardTitle>
						<CardDescription className="mb-2">
							You executed {dashboardStats?.total_closed_trades ?? 0} trades in the selected period.
						</CardDescription>
					</CardHeader>
					<CardContent className="px-2 sm:px-6 flex flex-col">
						{dashboardStats?.recent_trades?.map((trade, index) => (
							<div key={index}>
								<div className="flex items-center justify-center">
									<div className="ml-4">
										<p className="text-sm font-medium leading-none">{trade.symbol}</p>
										<a
											onClick={() => window.location.href = `/strategy/${trade.strategy_id}?execution=${trade.strategy_execution_id}`}
											className="cursor-pointer text-sm text-muted-foreground underline hover:text-primary"
										>
											{trade.strategy_name}
										</a>
									</div>
									<div className="ml-auto font-medium">{format(toZonedTime(new Date(trade.timestamp), user.timezone), "MMM dd yyyy, HH:mm")}</div>
									<div className={trade?.side === 'buy' ? 'text-[#2EBD85] ml-auto font-medium' : 'text-[#F6465D] ml-auto font-medium'}>{trade.side}</div>
									<div className={trade?.rel_profit >= 0 ? 'text-[#2EBD85] ml-auto font-medium' : 'text-[#F6465D] ml-auto font-medium'}>
										{trade?.rel_profit != null ? `${trade?.rel_profit > 0 ? '+' : ''}${(+trade?.rel_profit)?.toFixed(2)}` : '-'}%
									</div>
								</div>
								{index < dashboardStats.recent_trades.length - 1 && <Separator className="ml-4 mt-2 mb-4" />}
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
