import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ResultsChart } from "@/components/results-chart"
import { DateTimeRangePicker } from "@/components/date-time-range-picker";
import { DollarSign, Coins, CircleCheck, Calculator, Divide } from "lucide-react";
import { useSession } from "@/App";

export function Dashboard() {
	const { user } = useSession();
	const [selectedDatetimeRange, setSelectedDatetimeRange] = useState();
	const [isRealTrading, setIsRealTrading] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

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
					<Switch checked={isRealTrading} onCheckedChange={setIsRealTrading} disabled={isLoading} />
					<Label className="!opacity-100">Real trading</Label>
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">
							Total Net Profit
						</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">$45,231.89</div>
						<p className="text-xs text-muted-foreground">
							+20.1%
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">
							Total Closed Trades
						</CardTitle>
						<Coins className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="pt-3 text-2xl font-bold">135</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">Winning Trade Rate</CardTitle>
						<CircleCheck className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">63.23%</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="text-sm font-medium">
							Profit Factor
						</CardTitle>
						<Calculator className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">2.354</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">
							Avg. Trade Profit
						</CardTitle>
						<Divide className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">$45.89</div>
						<p className="text-xs text-muted-foreground">
							+1.1%
						</p>
					</CardContent>
				</Card>
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				<Card className="col-span-4 h-[380px] overflow-hidden flex flex-col pb-3">
					<CardTitle className="pl-4 pb-4">Net Profit by Trade</CardTitle>
					<CardContent className="pl-2 h-full flex flex-col">
						<ResultsChart
							// absCumProfit={([]).map(trade => trade.abs_cum_profit)}
							// relCumProfit={([]).map(trade => trade.rel_cum_profit)}
							absCumProfit={[1, 2, 3, 2, 1, 0, -1, -2, -1, 0]}
							relCumProfit={[2, 4, 6, 8, 10, 12, 14, 16, 18, 20]}
						/>
					</CardContent>
				</Card>
				<Card className="col-span-4 lg:col-span-3">
					<CardHeader>
						<CardTitle>Recent Trades</CardTitle>
						<CardDescription className="mb-2">
							You executed 265 trades in the selected period.
						</CardDescription>
					</CardHeader>
					<CardContent className="px-2 sm:px-6">
						<div className="flex items-center">
							<div className="ml-4">
								<p className="text-sm font-medium leading-none">Olivia Martin</p>
								<p className="text-sm text-muted-foreground">
									olivia.martin@email.com
								</p>
							</div>
							<div className="ml-auto font-medium">+$1,999.00</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
