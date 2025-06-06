const sponsors = [
	{ icon: <img src="https://www.svgrepo.com/show/353657/django-icon.svg" className="size-10" />, name: "Django" },
	{ icon: <img src="https://www.postgresql.org/media/img/about/press/elephant.png" className="size-10" />, name: "PostgreSQL" },
	{ icon: <img src="https://www.svgrepo.com/show/452092/react.svg" className="size-10" />, name: "React" },
	{ icon: <img src="https://avatars.githubusercontent.com/u/139895814" className="size-10" />, name: "Shadcn/ui" },
	{ icon: <img src="https://play-lh.googleusercontent.com/OoPpCoMOpPra6k0Qlwhfi14vOmqHfR790C1C7a_sHNqqUUYJhTYy6rjAmrv4eMLQRDbJ" className="size-10" />, name: "Lightweight Charts" },
	{ icon: <img src="https://avatars.githubusercontent.com/u/31901609" className="size-10" />, name: "CCXT" },
	{ icon: <img src="https://avatars.githubusercontent.com/u/21127168" className="size-10" />, name: "TA-Lib" },
];

export function TechStack() {
	return (
		<section id="sponsors" className="pt-24 sm:py-32">
			<h2 className="text-center text-md lg:text-xl font-bold mb-8 text-primary">
				Tech Stack
			</h2>
			<div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
				{sponsors.map(({ icon, name }) => (
					<div key={name} className="flex items-center gap-1 text-muted-foreground/60">
						{icon}
						<h3 className="text-xl font-bold">{name}</h3>
					</div>
				))}
			</div>
		</section>
	)
}
