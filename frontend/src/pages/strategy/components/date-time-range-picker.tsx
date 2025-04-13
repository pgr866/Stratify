import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type ButtonProps = {
	variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
	size?: "default" | "sm" | "lg" | "logo";
	width?: string;
	timezone: string;
	onChange?: (range: DateRange) => void;
};

export function DateTimeRangePicker({ variant = "default", size = "default", width = "200px", timezone = "UTC", onChange }: Readonly<ButtonProps>) {
	const [dateRange, setDateRange] = useState<DateRange>({
		from: undefined,
		to: undefined,
	});
	const [isSettingStartTime, setIsSettingStartTime] = useState(true);
	const [time, setTime] = useState({ hour: 0, minute: 0 });
	const [isOpen, setIsOpen] = useState(false);

	const hours = Array.from({ length: 24 }, (_, i) => i);
	const minutes = Array.from({ length: 60 }, (_, i) => i);

	const handleTimeChange = (field: "hour" | "minute", value: number) => {
		setTime((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const applyTimeToDateRange = () => {
		if (isSettingStartTime && dateRange.from) {
			const updatedFrom = new Date(dateRange.from);
			updatedFrom.setHours(time.hour);
			updatedFrom.setMinutes(time.minute);
			setDateRange((prev) => ({
				...prev,
				from: updatedFrom,
				to: prev?.to ?? undefined,
			}));
		} else if (!isSettingStartTime && dateRange.to) {
			const updatedTo = new Date(dateRange.to);
			updatedTo.setHours(time.hour);
			updatedTo.setMinutes(time.minute);
			setDateRange((prev) => ({
				...prev,
				from: prev?.from ?? undefined,
				to: updatedTo,
			}));
		}
	};

	useEffect(() => {
		applyTimeToDateRange();
	}, [time]);

	useEffect(() => {
    if (!isOpen && dateRange.from && dateRange.to) {
      onChange?.(dateRange);
    }
  }, [isOpen, dateRange, onChange]);

	const formatDateTime = (date: Date | undefined) => {
		if (!date) return "";
		return format(date, "MMM dd yyyy, HH:mm");
	};

	const handleSelect = (range: DateRange | undefined) => {
		if (range) {
			const { from, to } = range;
			if (from && (!dateRange.from || from.getTime() !== dateRange.from.getTime())) {
				setDateRange({ from, to: undefined });
				setTime({ hour: 0, minute: 0 });
				setIsSettingStartTime(true);
			} else if (from && to) {
				setDateRange({ from, to });
				setTime({ hour: 0, minute: 0 });
				setIsSettingStartTime(false);
			}
		}
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant={variant}
					size={size}
					style={{ width }}
					className={cn(
						"justify-start text-left font-normal overflow-hidden"
					)}>
					<CalendarIcon /> {dateRange.from && dateRange.to
						? `${formatDateTime(dateRange.from)} - ${formatDateTime(dateRange.to)}`
						: "Pick date and time range"}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-4 border-[1px] border-border">
				<div className="flex gap-4">
					{/* Calendar */}
					<div className="flex-1">
						<Calendar
							mode="range"
							selected={dateRange}
							onSelect={handleSelect}
							initialFocus
							defaultMonth={undefined}
							disabled={(date) =>
								date > new Date() || date < new Date("1900-01-01")
							}
						/>
					</div>

					{/* Time Selection (Hour + Minute) */}
					<div className="flex flex-col space-y-4 w-36 items-center">
						<span className="font-semibold text-sm">
							{isSettingStartTime ? "Start Time" : "End Time"}
						</span>

						{/* Hours and Minutes Containers */}
						<div className="flex gap-4">
							{/* Hours */}
							<div className="w-16">
								<span className="font-semibold text-sm">Hours</span>
								<ScrollArea className="h-[14rem] overflow-auto">
									<div className="grid gap-1">
										{hours.map((hour) => (
											<Button
												key={hour}
												size="sm"
												variant={time.hour === hour ? "default" : "ghost"}
												className="mr-3"
												onClick={() => handleTimeChange("hour", hour)}
											>
												{hour.toString().padStart(2, "0")}
											</Button>
										))}
									</div>
								</ScrollArea>
							</div>

							{/* Minutes */}
							<div className="w-16">
								<span className="font-semibold text-sm">Minutes</span>
								<ScrollArea className="h-[14rem] overflow-auto">
									<div className="grid gap-1">
										{minutes.map((minute) => (
											<Button
												key={minute}
												size="sm"
												variant={time.minute === minute ? "default" : "ghost"}
												className="mr-3"
												onClick={() => handleTimeChange("minute", minute)}
											>
												{minute.toString().padStart(2, "0")}
											</Button>
										))}
									</div>
								</ScrollArea>
							</div>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}
