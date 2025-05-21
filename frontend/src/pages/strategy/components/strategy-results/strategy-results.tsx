import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Strategy, updateStrategy } from "@/api";
import { ResultsChart } from "./components/results-chart";
import { useSession } from "@/App";

interface StrategyResultsProps {
  readonly selectedStrategy: Strategy[];
  readonly setSelectedStrategy: React.Dispatch<React.SetStateAction<Strategy | null>>;
  readonly isLoading: boolean;
  readonly setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function StrategyResults({ selectedStrategy, setSelectedStrategy, isLoading, setIsLoading }: StrategyResultsProps) {
  const { user } = useSession();

  const handlePublish = async () => {
    setIsLoading(true);
    updateStrategy(selectedStrategy.id, { ...selectedStrategy, is_public: !selectedStrategy.is_public, indicators: JSON.stringify(selectedStrategy.indicators) })
      .then((response: Strategy) => {
        setSelectedStrategy({ ...response.data, indicators: JSON.parse(response.data.indicators ?? '[]') });
        toast("Strategy visibility updated successfully", { description: "Your strategy is " + (response.data.is_public ? "public" : "private") + " now" });
      })
      .catch((error) => toast("Failed to update strategy", { description: error.message }))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="flex flex-col size-full">
      {user?.id === selectedStrategy?.user && (
        <Button size="sm" onClick={handlePublish} disabled={isLoading} className="flex-none w-fit">
          {isLoading ? (
            <Loader2 className="animate-spin mx-6.5" />
          ) : (
            selectedStrategy?.is_public ? "Unpublish" : "\u00A0\u00A0Publish\u00A0\u00A0"
          )}
        </Button>
      )}
      <div className="flex-grow overflow-hidden">
        <ResultsChart
          netProfit={[
            0, 80, 120, 90, -50, 140, 160, -70, 200, 250,
            30, 60, -90, 110, 130, -40, 180, 190, -30, 210,
            40, 55, 70, 60, -20, 100, 150, -80, 170, 220,
            20, -30, 40, 90, 110, -50, 130, 160, 180, 210,
          ]}
          drawdown={[
            0, -300, -250, -400, -350, -330, -370, -340, -290, -250,
            0, -320, -270, -420, -360, -340, -390, -360, -310, -270,
            0, -310, -260, -410, -355, -335, -380, -350, -300, -260,
            0, -290, -240, -390, -340, -320, -370, -330, -280, -240,
          ]}
          hodlingProfit={[
            0, 10, 25, 40, 55, 70, 85, 90, 100, 110,
            15, 20, 30, 45, 60, 75, 80, 95, 105, 115,
            20, 25, 35, 50, 65, 80, 85, 100, 110, 120,
            10, 15, 20, 35, 50, 65, 70, 85, 95, 105,
          ]}
        />
      </div>
    </div>
  );
}