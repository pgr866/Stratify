import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/combobox";
import { Search, Landmark, Bitcoin, CirclePlus, AlignHorizontalDistributeCenter, Users } from "lucide-react";
import { toast } from "sonner"
import { getAllExchanges, getExchangeSymbols, getStrategies, createStrategy, Strategy } from "@/api";

const PAGE_SIZE = 10;

export function ExploreStrategies() {
	const navigate = useNavigate();
	const [searchValue, setSearchValue] = useState("");
	const [onlyMine, setOnlyMine] = useState(false);
	const [exchanges, setExchanges] = useState([]);
	const [symbols, setSymbols] = useState([]);
	const [selectedExchange, setSelectedExchange] = useState("");
	const [selectedSymbol, setSelectedSymbol] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [filteredStrategies, setFilteredStrategies] = useState<Strategy[]>([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [loadingStrategies, setLoadingStrategies] = useState(false);
	const observerRef = useRef<HTMLDivElement | null>(null);

	const tagConfig = [
		{
			condition: (value: string) => !value.includes(":"),
			label: "Spot",
			className: "bg-primary text-primary-foreground"
		},
		{
			condition: (value: string) => value.includes(":"),
			label: "Perpetual",
			className: "bg-destructive text-destructive-foreground"
		}
	]

	useEffect(() => {
		getAllExchanges()
			.then((response: { data: string[] }) => setExchanges(response.data.map((exchange) => exchange[0].toUpperCase() + exchange.slice(1))))
			.catch((error) => toast("Failed to fetch exchanges", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }));
	}, []);

	useEffect(() => {
		if (!selectedExchange) return;
		setIsLoading(true);
		getExchangeSymbols(selectedExchange.toLowerCase())
			.then((response) => {
				const newSymbols = response.data.symbols.map((symbol) => symbol.symbol);
				setSymbols(newSymbols);
				if (!newSymbols.includes(selectedSymbol)) {
					setSelectedSymbol("");
				}
			})
			.catch((error) => console.error("Error fetching exchange symbols:", error))
			.finally(() => setIsLoading(false));
	}, [selectedExchange]);

	useEffect(() => {
		setFilteredStrategies([]);
		setPage(1);
		setHasMore(true);
	}, [searchValue, onlyMine, selectedExchange, selectedSymbol]);

	useEffect(() => {
		setLoadingStrategies(true);
		const nameParam = searchValue === "" ? undefined : searchValue;
		const exchangeParam = selectedExchange === "" ? undefined : selectedExchange;
		const symbolParam = selectedSymbol === "" ? undefined : selectedSymbol;
		getStrategies(nameParam, onlyMine, exchangeParam, symbolParam, page, PAGE_SIZE)
			.then((response) => {
				if (!response) return;
				setFilteredStrategies(prev => [...prev, ...response.data.results]);
				const totalPages = Math.ceil(response.data.count / PAGE_SIZE);
				setHasMore(page < totalPages);
			})
			.catch((err) => {
				console.error("Error fetching strategies:", err);
			})
			.finally(() => setLoadingStrategies(false));
	}, [page, searchValue, onlyMine, selectedExchange, selectedSymbol]);

	useEffect(() => {
		if (loadingStrategies) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loadingStrategies) {
					setPage((prev) => prev + 1);
				}
			},
			{ threshold: 0.1 }
		);
		if (observerRef.current) {
			observer.observe(observerRef.current);
		}
		return () => {
			if (observerRef.current) observer.unobserve(observerRef.current);
		};
	}, [hasMore, loadingStrategies]);

	const handleCreateStrategy = () => {
		setIsLoading(true);
		createStrategy()
			.then((response: StrategyType) => {
				navigate(`/strategy/${response.data.id}`);
				toast("Strategy created successfully");
			})
			.catch((error) => toast("Failed to create new strategy", { description: error.response?.data?.detail ?? error.message ?? "Unknown error" }))
			.finally(() => setIsLoading(false));
	}

	return (
		<div className="px-4 pb-4 flex flex-col gap-4 sm:min-w-[300px] sm:w-[70%] md:min-w-[620px] lg:w-[60%] xl:w-[55%] mx-auto">
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2 relative w-full my-1">
					<Button variant="default" onClick={handleCreateStrategy} className="rounded-full text-sm px-4 py-1 h-8">
						<CirclePlus />
						New Strategy
					</Button>
					<Input
						type="search"
						placeholder="Search strategy by name"
						className="w-full pr-8"
						maxLength={50}
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
					/>
					<Search className="absolute size-4 right-3 top-1/2 transform -translate-y-1/2 text-input" />
				</div>
				<div className="w-full flex justify-center flex-wrap gap-3">
					<Label>Filters:</Label>
					<Button disabled={isLoading} variant={onlyMine ? "default" : "outline"} onClick={() => setOnlyMine(!onlyMine)} className="rounded-full text-sm px-4 py-1 h-8">Only Mine</Button>
					<Combobox value={selectedExchange} values={exchanges} onChange={(value) => setSelectedExchange(value)} isLoading={isLoading} variant="outline" size="sm" width="200px" placeholder="Exchange" icon={<Landmark />} />
					{!selectedExchange ? (
						<div className="relative w-[250px]">
							<Input value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} variant="outline" size="sm" placeholder="Symbol" disabled={isLoading} className="pl-9 w-[200px] h-8" />
							<Bitcoin className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground" size={16} />
						</div>
					) : (
						<Combobox value={selectedSymbol} values={symbols} onChange={(value) => setSelectedSymbol(value)} isLoading={isLoading} variant="outline" size="sm" width="200px" placeholder="Symbol" icon={<Bitcoin />} tagConfig={tagConfig} disabled={!selectedExchange} />
					)}
				</div>
			</div>
			{filteredStrategies.map((strategy) => (
				<Card key={strategy.id} className="shadow-md">
					<CardHeader>
						<CardTitle className="flex justify-between items-center text-sm text-muted-foreground capitalize">
							<a onClick={() => window.location.href = `/strategy/${strategy.id}`} className="text-foreground text-lg cursor-pointer underline hover:text-primary">
								{strategy.name}
							</a>
							<p className="flex items-center gap-1">
								<Landmark className="size-5" />
								{strategy.exchange}
							</p>
							<p className="flex items-center gap-1">
								<Bitcoin className="size-5" />
								{strategy.symbol}
							</p>
							<p className="flex items-center gap-1">
								<AlignHorizontalDistributeCenter className="size-5" />
								{strategy.timeframe}
							</p>
							<p className="flex items-center gap-1">
								<Users className="size-5" />
								{strategy.clones_count}
							</p>
						</CardTitle>
					</CardHeader>
				</Card>
			))}
			<div ref={observerRef} />
			{loadingStrategies && <p>Loading more...</p>}
			{!hasMore && <p>No more strategies.</p>}
		</div>
	)
}
