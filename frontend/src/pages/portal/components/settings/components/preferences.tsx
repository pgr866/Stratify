import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label"
import { toast } from "sonner";

export function Preferences() {
	const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
	const selectedTimezone = "UTC";

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-medium">Preferences</h3>
				<p className="text-sm text-muted-foreground">Set your preferred timezone.</p>
			</div>
			<Separator />
			<div>
				<div className="flex items-center mb-2">
					<Label>Timezone</Label>
				</div>
				<Select defaultValue={selectedTimezone}>
					<SelectTrigger className="w-full max-w-60">
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="w-full">
						<SelectGroup>
							{timezones.map((value) => (
								<SelectItem key={value} value={value}>
									{value}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<p className="text-sm text-muted-foreground">Select the timezone you want to use across the platform.</p>
			</div>

			<Button type="submit">Update preferences</Button>
		</div>
	)
}