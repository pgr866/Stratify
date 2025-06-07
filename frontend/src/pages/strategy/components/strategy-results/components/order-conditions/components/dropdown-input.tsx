import * as React from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const defaultValues = [
  "open",
  "high",
  "low",
  "close",
  "volume",
  "position_amount",
  "position_value",
  "avg_entry_price",
  "remaining_tradable_value",
  "unrealized_total_value",
  "realized_total_value",
  "min(, )",
  "max(, )",
  "abs()",
];

export function DropDownInput({
  disabled = false,
  placeholder = "",
  value,
  onChange,
  indicators = [],
}: Readonly<{
  disabled?: boolean;
  placeholder?: string;
  value?: string | number;
  indicators?: string[];
  onChange?: (val: string) => void;
}>) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [expandedIndicators, setExpandedIndicators] = React.useState<string[]>([]);

  React.useEffect(() => {
    const result = indicators.flatMap(ind => {
      if (ind.startsWith('BBANDS_')) {
        return [
          `${ind}_upperband`,
          `${ind}_middleband`,
          `${ind}_lowerband`,
        ];
      }
      if (ind.startsWith('MACD_')) {
        return [
          `${ind}_macdhist`,
          `${ind}_macd`,
          `${ind}_macdsignal`,
        ];
      }
      if (ind.startsWith('AROON_')) {
        return [
          `${ind}_aroondown`,
          `${ind}_aroonup`,
        ];
      }
      if (ind.startsWith('STOCH_')) {
        return [
          `${ind}_slowk`,
          `${ind}_slowd`,
        ];
      }
      if (ind.startsWith('STOCHRSI_')) {
        return [
          `${ind}_fastk`,
          `${ind}_fastd`,
        ];
      }
      return [ind];
    });

    setExpandedIndicators(result);
  }, [indicators]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleOptionClick = (option: string) => {
    const newValue = value ? `${value} ${option}` : option;
    onChange?.(newValue);
  };

  return (
    <div className="w-76">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div ref={triggerRef} className="w-full">
            <Input
              disabled={disabled}
              ref={inputRef}
              type="text"
              value={value ?? ""}
              onChange={handleInputChange}
              onClick={() => setOpen(true)}
              placeholder={placeholder}
              className="w-full"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={5}
          className="p-0 !w-full max-h-[300px] overflow-y-auto"
          style={{ width: `${width}px` }}
        >
          <div className="grid gap-1 p-2">
            {[...defaultValues, ...expandedIndicators].map((option) => (
              <Button
                key={option}
                variant="ghost"
                className="w-full justify-start font-normal"
                onClick={() => {
                  handleOptionClick(option);
                  setOpen(false);
                }}
              >
                {option}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}