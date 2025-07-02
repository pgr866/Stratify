import { useState, useEffect } from "react";
import { ResultsChart } from "@/components/results-chart";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react";
import { StrategyExecution } from "@/api";

export function Performance({ strategyExecution }: { readonly strategyExecution: StrategyExecution }) {
  const [quoteCurrency, setQuoteCurrency] = useState("");

  useEffect(() => {
    setQuoteCurrency(strategyExecution?.symbol?.split(/[:/]/).pop());
  }, [strategyExecution?.symbol]);

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

  return (
    <div className="h-full flex flex-col">
      <TooltipProvider>
        <div className="mx-4 my-2 w-full flex">

          <div className="flex flex-col flex-1 gap-2">
            <div className="flex items-center gap-1">
              <Label>Net profit</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>The overall profit or loss achieved.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-1">
              <Label className={strategyExecution?.abs_net_profit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}>
                {formatNumber(strategyExecution?.abs_net_profit) ?? '-'} {quoteCurrency}
              </Label>
              <Label className={strategyExecution?.rel_net_profit >= 0 ? 'text-[#2EBD85] text-xs' : 'text-[#F6465D] text-xs'}>
                {(+strategyExecution?.rel_net_profit)?.toFixed(2) ?? '-'}%
              </Label>
            </div>
          </div>

          <div className="flex flex-col mr-8 gap-2">
            <div className="flex items-center gap-1">
              <Label>Total closed trades</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="leading-snug">The total number of closed trades,<br />winning and losing.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Label>
              {strategyExecution?.total_closed_trades ?? 0}
            </Label>
          </div>

          <div className="flex flex-col mr-8 gap-2">
            <div className="flex items-center gap-1">
              <Label>Winning trade rate</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="leading-snug">The percentage of winning trades, the number of<br />winning trades divided by the total number of<br />closed trades.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-1">
              <Label className={strategyExecution?.winning_trade_rate >= 50 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}>
                {(+strategyExecution?.winning_trade_rate)?.toFixed(2) ?? "-"}%
              </Label>
            </div>
          </div>

          <div className="flex flex-col mr-8 gap-2">
            <div className="flex items-center gap-1">
              <Label>Profit factor</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="leading-snug">The amount of money the strategy made for<br />every unit of money it lost, gross profits divided<br />by gross loses.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-1">
              <Label className={strategyExecution?.profit_factor >= 1 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}>
                {(+strategyExecution?.profit_factor)?.toFixed(3) ?? "-"}
              </Label>
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-2">
            <div className="flex items-center gap-1">
              <Label>Avg. trade profit</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="leading-snug">The average profit or loss per trade,<br />calculated by dividing net profit by the<br />number of closed trades.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-1">
              <Label className={strategyExecution?.abs_avg_trade_profit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}>
                {formatNumber(strategyExecution?.abs_avg_trade_profit) ?? '-'} {quoteCurrency}
              </Label>
              <Label className={strategyExecution?.rel_avg_trade_profit >= 0 ? 'text-[#2EBD85] text-xs' : 'text-[#F6465D] text-xs'}>
                {(+strategyExecution?.rel_avg_trade_profit)?.toFixed(2) ?? '-'}%
              </Label>
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-2">
            <div className="flex items-center gap-1">
              <Label>Max. run-up</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="leading-snug">The largest run-up of wins, i.e., the maximum<br />possible win that the strategy could have incurred<br />among all of the trades it has made.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-1">
              <Label className="text-[#2EBD85]">
                {formatNumber(strategyExecution?.abs_max_run_up) ?? '-'} {quoteCurrency}
              </Label>
              <Label className="text-[#2EBD85] text-xs">
                {(+strategyExecution?.rel_max_run_up)?.toFixed(2) ?? '-'}%
              </Label>
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-2">
            <div className="flex items-center gap-1">
              <Label>Max. drawdown</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="leading-snug">The greatest loss drawdown, i.e., the greatest<br />possible loss the strategy had compared to its<br />highest profits.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-1">
              <Label className="text-[#F6465D]">
                {formatNumber(strategyExecution?.abs_max_drawdown) ?? '-'} {quoteCurrency}
              </Label>
              <Label className="text-[#F6465D] text-xs">
                {(+strategyExecution?.rel_max_drawdown)?.toFixed(2) ?? '-'}%
              </Label>
            </div>
          </div>

        </div>
      </TooltipProvider>
      <ResultsChart
        absCumProfit={(strategyExecution?.trades ?? []).map(trade => trade.abs_cum_profit)}
        relCumProfit={(strategyExecution?.trades ?? []).map(trade => trade.rel_cum_profit)}
        absDrawdown={(strategyExecution?.trades ?? []).map(trade => trade.abs_drawdown)}
        relDrawdown={(strategyExecution?.trades ?? []).map(trade => trade.rel_drawdown)}
        absHodlingProfit={(strategyExecution?.trades ?? []).map(trade => trade.abs_hodling_profit)}
        relHodlingProfit={(strategyExecution?.trades ?? []).map(trade => trade.rel_hodling_profit)}
      />
    </div>
  )
}
