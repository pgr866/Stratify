import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime, getTimezoneOffset } from 'date-fns-tz';
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
	range?: { from: number; to: number };
	onChange?: (range: { from: number; to: number }) => void;
};

export function DateTimeRangePicker({
	variant = "default",
	size = "default",
	width = "200px",
	timezone = "UTC",
	range,
	onChange
}: Readonly<ButtonProps>) {

	const convertUtcTimestampToZonedDate = (timestamp: number, timezone: string): Date => {
		const dateUTC = new Date(timestamp);
		return toZonedTime(dateUTC, timezone);
	};

	const convertDateToUtcTimestamp = (date: Date, timezone: string): number => {
		const dateUTC = fromZonedTime(date, "UTC");
		const offsetMs = getTimezoneOffset(timezone, dateUTC);
		return dateUTC.getTime() - offsetMs;
	};

	const initialDateRange: DateRange = {
		from: range?.from ? convertUtcTimestampToZonedDate(range?.from, timezone) : undefined,
		to: range?.to ? convertUtcTimestampToZonedDate(range?.to, timezone) : undefined,
	};

	const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
	const prevDateRange = useRef<DateRange>(initialDateRange);

	const [isSettingStartTime, setIsSettingStartTime] = useState(range === undefined);
	const [time, setTime] = useState({ hour: 0, minute: 0 });
	const [isOpen, setIsOpen] = useState(false);

	const hours = Array.from({ length: 24 }, (_, i) => i);
	const minutes = Array.from({ length: 60 }, (_, i) => i);

	useEffect(() => {
		const newRange: DateRange = {
			from: range?.from ? convertUtcTimestampToZonedDate(range.from, timezone) : undefined,
			to: range?.to ? convertUtcTimestampToZonedDate(range.to, timezone) : undefined,
		};

		if (
			newRange.from?.getTime() !== dateRange.from?.getTime() ||
			newRange.to?.getTime() !== dateRange.to?.getTime()
		) {
			setDateRange(newRange);
			prevDateRange.current = newRange;
		}
	}, [range, timezone]);

	const handleTimeChange = (field: "hour" | "minute", value: number) => {
		setTime((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const applyTimeToDateRange = () => {
		if (isOpen && isSettingStartTime && dateRange.from) {
			const updatedFrom = new Date(dateRange.from);
			updatedFrom.setHours(time.hour);
			updatedFrom.setMinutes(time.minute);
			setDateRange((prev) => ({
				...prev,
				from: updatedFrom,
				to: prev?.to ?? undefined,
			}));
		} else if (isOpen && !isSettingStartTime && dateRange.to) {
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
		if (!isOpen && dateRange.from && dateRange.to &&
			(dateRange.from.getTime() !== prevDateRange.current?.from?.getTime() || dateRange.to.getTime() !== prevDateRange.current?.to?.getTime())) {
			const newFrom = convertDateToUtcTimestamp(dateRange.from, timezone);
			const newTo = convertDateToUtcTimestamp(dateRange.to, timezone);
			const prevFrom = convertDateToUtcTimestamp(prevDateRange.current.from!, timezone);
			const prevTo = convertDateToUtcTimestamp(prevDateRange.current.to!, timezone);
			if (newFrom !== prevFrom || newTo !== prevTo) {
				onChange?.({ from: newFrom, to: newTo });
				prevDateRange.current = dateRange;
			}
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
								fromZonedTime(date, "UTC").getTime() > (new Date()).getTime() + getTimezoneOffset(timezone, new Date()) ||
								fromZonedTime(date, "UTC").getTime() < new Date("2009-01-01").getTime()
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
