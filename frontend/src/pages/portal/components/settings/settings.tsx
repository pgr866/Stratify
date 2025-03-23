import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Account } from './components/account';
import { Preferences } from './components/preferences';
import { UserRound, Bolt } from "lucide-react"

export function Settings() {
	const [selected, setSelected] = useState('account');

	return (
		<div className="space-y-6 px-4">
			<div className="space-y-0.5">
				<h1 className="text-xl lg:text-2xl font-bold tracking-tight">Settings</h1>
				<p className="text-md text-muted-foreground">
					Manage your account settings and customize your preferences.
				</p>
			</div>
			<Separator className="my-6" />
			<div className="flex flex-col lg:flex-row lg:space-x-4">
				<div className="mr-4 lg:w-1/5 flex max-sm:flex-wrap lg:flex-col justify-start items-start h-auto mb-6">
					<Button
						variant="ghost"
						className={`w-full flex justify-start items-center ${selected === 'account' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline'}`}
						onClick={() => setSelected('account')}>
						<UserRound className="mb-[0.2rem]" />
						Account
					</Button>
					<Button
						variant="ghost"
						className={`w-full flex justify-start items-center ${selected === 'preferences' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline'}`}
						onClick={() => setSelected('preferences')}>
						<Bolt className="mb-0.5" />
						Preferences
					</Button>
				</div>
				<div className="flex-1 w-full">
					{selected === 'account' && <Account />}
					{selected === 'preferences' && <Preferences />}
				</div>
			</div>
		</div>
	)
}
