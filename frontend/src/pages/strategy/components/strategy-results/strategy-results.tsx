import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Strategy, updateStrategy } from "@/api"
import { useSession } from "@/App";;

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
      .then((response: Strategy) => setSelectedStrategy({ ...response.data, indicators: JSON.parse(response.data.indicators ?? '[]') }))
      .catch((error) => toast("Failed to update strategy", { description: error.message }))
      .finally(() => setIsLoading(false));
  };

  return (
    <div>
      {user?.id === selectedStrategy?.user && (
        <Button size="sm" onClick={handlePublish} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="animate-spin mx-6.5" />
          ) : (
            selectedStrategy?.is_public ? "Unpublish" : "\u00A0\u00A0Publish\u00A0\u00A0"
          )}
        </Button>
      )}
    </div>
  );
}