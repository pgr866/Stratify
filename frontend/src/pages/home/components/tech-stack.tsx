const techs = [
	{ icon: <img src="/django.svg" className="size-10" />, name: "Django" },
	{ icon: <img src="/postgresql.png" className="size-10" />, name: "PostgreSQL" },
	{ icon: <img src="/react.svg" className="size-10" />, name: "React" },
	{ icon: <img src="/shadcnui.png" className="size-10" />, name: "Shadcn/ui" },
	{ icon: <img src="/lightweight-charts.png" className="size-10" />, name: "Lightweight Charts" },
	{ icon: <img src="/ccxt.png" className="size-10" />, name: "CCXT" },
	{ icon: <img src="/ta-lib.png" className="size-10" />, name: "TA-Lib" },
];

export function TechStack() {
	return (
		<section id="tech-stack" className="pt-24 sm:py-32">
			<h2 className="text-center text-md lg:text-xl font-bold mb-8 text-primary">
				Tech Stack
			</h2>
			<div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
				{techs.map(({ icon, name }) => (
					<div key={name} className="flex items-center gap-1 text-muted-foreground/60">
						{icon}
						<h3 className="text-xl font-bold">{name}</h3>
					</div>
				))}
			</div>
		</section>
	)
}
