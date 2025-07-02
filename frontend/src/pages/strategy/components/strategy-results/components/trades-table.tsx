import { useRef, useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { Trade } from "@/api";
import { useSession } from "@/App";

export function TradesTable({ trades, symbol }: { readonly trades: Trade[]; readonly symbol: string; }) {
	const { user } = useSession();
	const [baseCurrency, setBaseCurrency] = useState("");
	const [quoteCurrency, setQuoteCurrency] = useState("");
	const rowHeight = 47.27;
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const parts = symbol?.split(/[:/]/);
		setBaseCurrency(parts?.[0]);
		setQuoteCurrency(parts?.[parts.length - 1]);
	}, [symbol]);

	function formatNumber(number) {
		try {
			number = Number(number);
			const cleaned = number?.toFixed(12).replace(/0+$/, '');
			const match = cleaned?.match(/^(-?)0\.(0{5,})(\d+)$/);
			if (match) {
				const sign = match[1];
				const zeros = match[2].length;
				const significant = match[3];
				return `${sign}0.0{${zeros - 1}}${significant}`;
			}
			if (number >= 1000) {
				return +number.toFixed(5);
			}
			return +number.toFixed(8);
		} catch {
			return number;
		}
	}

	const sortedTrades = trades?.slice().sort((a, b) => b.timestamp - a.timestamp) ?? [];

	const virtualizer = useVirtualizer({
		count: sortedTrades?.length ?? 0,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => rowHeight,
		overscan: 5,
	});

	const virtualRows = virtualizer.getVirtualItems();
	scrollRef.current?.parentElement && (scrollRef.current.parentElement.style.paddingBottom = `${rowHeight}px`);

	return (
		<div ref={scrollRef} className="overflow-auto w-full box-content">
			<Table className="table-fixed w-[1360px] text-[0.8rem]">
				<TableHeader>
					<TableRow>
						<TableHead className="text-muted-foreground w-[60px]">Trade #</TableHead>
						<TableHead className="text-muted-foreground w-[70px]">Type</TableHead>
						<TableHead className="text-muted-foreground w-[50px]">Side</TableHead>
						<TableHead className="text-muted-foreground w-[150px]">Date/Time</TableHead>
						<TableHead className="text-muted-foreground w-[126px]">Price</TableHead>
						<TableHead className="text-muted-foreground w-[126px]">Amount</TableHead>
						<TableHead className="text-muted-foreground w-[136px]">Cost</TableHead>
						<TableHead className="text-muted-foreground w-[126px]">Avg. Entry Price</TableHead>
						<TableHead className="text-muted-foreground w-[126px]">Net Profit</TableHead>
						<TableHead className="text-muted-foreground w-[126px]">Cum. Profit</TableHead>
						<TableHead className="text-muted-foreground w-[126px]">Run-up</TableHead>
						<TableHead className="text-muted-foreground w-[126px]">Drawdown</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="relative" style={{ height: virtualizer.getTotalSize() }}>
					{virtualRows.map(virtualRow => {
						const trade = sortedTrades[virtualRow.index];
						return (
							<TableRow
								key={trade.id}
								className="absolute top-0 left-0 w-full flex"
								style={{ height: rowHeight, transform: `translateY(${virtualRow.start}px)` }}>
								<TableCell className="justify-center font-medium w-[61px]">{sortedTrades.length - virtualRow.index}</TableCell>
								<TableCell className="w-[71px]">{trade.type}</TableCell>
								<TableCell className={`w-[51px] ${trade?.side === 'buy' ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>{trade.side}</TableCell>
								<TableCell className="w-[151px]">
									{format(toZonedTime(new Date(trade.timestamp), user.timezone), "MMM dd yyyy, HH:mm")}
								</TableCell>
								<TableCell className="w-[127px]">{formatNumber(trade.price)} {quoteCurrency}</TableCell>
								<TableCell className="w-[127px]">{formatNumber(trade.amount)} {baseCurrency}</TableCell>
								<TableCell className="w-[137px]">{formatNumber(trade.cost)} {quoteCurrency}</TableCell>
								<TableCell className="w-[127px]">{formatNumber(trade.avg_entry_price)} {quoteCurrency}</TableCell>

								<TableCell className="flex flex-col !items-start w-[127px]">
									<Label className={`text-[0.8rem] ${trade?.abs_profit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
										{formatNumber(trade?.abs_profit)} {quoteCurrency}
									</Label>
									<Label className={`text-xs ${trade?.rel_profit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
										{trade?.rel_profit.toFixed(2)}%
									</Label>
								</TableCell>
								<TableCell className="flex flex-col !items-start w-[127px]">
									<Label className={`text-[0.8rem] ${trade?.abs_cum_profit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
										{formatNumber(trade?.abs_cum_profit)} {quoteCurrency}
									</Label>
									<Label className={`text-xs ${trade?.rel_cum_profit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
										{trade?.rel_cum_profit.toFixed(2)}%
									</Label>
								</TableCell>

								<TableCell className="flex flex-col !items-start w-[127px]">
									<Label className="text-[0.8rem]">
										{formatNumber(trade?.abs_runup)} {quoteCurrency}
									</Label>
									<Label className="text-xs">
										{trade?.rel_runup.toFixed(2)}%
									</Label>
								</TableCell>
								<TableCell className="flex flex-col !items-start w-[127px]">
									<Label className="text-[0.8rem]">
										{formatNumber(trade?.abs_drawdown)} {quoteCurrency}
									</Label>
									<Label className="text-xs">
										{trade?.rel_drawdown.toFixed(2)}%
									</Label>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
			{sortedTrades?.length === 0 && (
				<div className="w-full flex justify-center">
					<div className="text-muted-foreground py-10 text-center">
						No trades available
					</div>
				</div>
			)}
		</div>
	);
}
