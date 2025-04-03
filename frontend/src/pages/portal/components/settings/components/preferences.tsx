import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/combobox";
import { ClockFading, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { useSession } from "@/App";
import { updateTimezone } from "@/api";

export function Preferences() {
	const { user, setUser } = useSession();
	const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
	const [selectedTimezone, setSelectedTimezone] = useState(user.timezone);
	const [isLoading, setIsLoading] = useState(false);

	const handleUpdateTimezone = async () => {
		try {
			setIsLoading(true);
			const response = await updateTimezone(selectedTimezone);
			setUser({ ...user, timezone: response.data.timezone });
			toast("Preferences updated successfully");
		} catch (error) {
			const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
			const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
				? Object.entries(axiosError.response.data).map(([k, v]) =>
					k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
				: "Something went wrong";
			toast("Failed to update preferences", { description: errorMessage });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-5">
			<div>
				<h3 className="text-lg font-medium">Preferences</h3>
				<p className="text-sm text-muted-foreground">Set your preferred timezone.</p>
			</div>
			<Separator />
			<div>
				<div className="flex items-center mb-2">
					<Label>Timezone</Label>
				</div>
				<Combobox defaultValue={selectedTimezone} values={timezones} variant={"outline"} size={"default"} width={"300px"} placeholder={"Timezone"} onChange={(value) => setSelectedTimezone(value)} icon={<ClockFading />} />
				<p className="text-sm text-muted-foreground">Select the timezone you want to use across the platform.</p>
			</div>

			<Button onClick={handleUpdateTimezone} disabled={isLoading}>
				{isLoading ? (
					<><Loader2 className="animate-spin mr-2" />Loading...</>
				) : (
					"Update preferences"
				)}
			</Button>
		</div>
	)
}