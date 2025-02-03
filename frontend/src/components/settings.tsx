import { useState } from 'react';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ProfileSettings } from "@/components/profile-settings";
import { AccountSettings } from '@/components/account-settings';
import { AppearanceSettings } from '@/components/appearance-settings';
import { NotificationsSettings } from '@/components/notifications-settings';
import { DisplaySettings } from '@/components/display-settings';

export function Settings() {
	const [selected, setSelected] = useState('profile');

	return (
		<div className="space-y-6 p-4">
			<div className="space-y-0.5">
				<h1 className="text-xl lg:text-2xl font-bold tracking-tight">Settings</h1>
				<p className="text-md text-muted-foreground">
					Manage your account settings and set e-mail preferences.
				</p>
			</div>
			<Separator className="my-6" />
			<div className="flex flex-col lg:flex-row lg:space-x-4">
				<div className="mr-4 lg:w-1/5 flex max-sm:flex-wrap lg:flex-col justify-start items-start h-auto mb-6">
					<Button
						variant="ghost"
						className={`w-full flex justify-start items-center ${selected === 'profile' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline'}`}
						onClick={() => setSelected('profile')}>
						Profile
					</Button>
					<Button
						variant="ghost"
						className={`w-full flex justify-start items-center ${selected === 'account' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline'}`}
						onClick={() => setSelected('account')}>
						Account
					</Button>
					<Button
						variant="ghost"
						className={`w-full flex justify-start items-center ${selected === 'appearance' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline'}`}
						onClick={() => setSelected('appearance')}>
						Appearance
					</Button>
					<Button
						variant="ghost"
						className={`w-full flex justify-start items-center ${selected === 'notifications' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline'}`}
						onClick={() => setSelected('notifications')}>
						Notifications
					</Button>
					<Button
						variant="ghost"
						className={`w-full flex justify-start items-center ${selected === 'display' ? 'bg-muted hover:bg-muted' : 'hover:bg-transparent hover:underline'}`}
						onClick={() => setSelected('display')}>
						Display
					</Button>
				</div>
				<div className="flex-1 w-full">
					{selected === 'profile' && <ProfileSettings />}
					{selected === 'account' && <AccountSettings />}
					{selected === 'appearance' && <AppearanceSettings />}
					{selected === 'notifications' && <NotificationsSettings />}
					{selected === 'display' && <DisplaySettings />}
				</div>
			</div>
		</div>
	)
}
