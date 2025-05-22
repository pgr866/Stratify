import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, History } from "lucide-react";
import { OrderConditions } from "./components/order-conditions";
import { Performance } from "./components/performance";
import { TradesTable } from "./components/trades-table";
import { Combobox } from "@/components/combobox";
import { useSession } from "@/App";
import { Strategy, updateStrategy } from "@/api";

interface StrategyResultsProps {
  readonly selectedStrategy: Strategy[];
  readonly setSelectedStrategy: React.Dispatch<React.SetStateAction<Strategy | null>>;
  readonly isLoading: boolean;
  readonly setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function StrategyResults({ selectedStrategy, setSelectedStrategy, isLoading, setIsLoading }: StrategyResultsProps) {
  const { user } = useSession();
  const [selectedTab, setSelectedTab] = useState("order-conditions");

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
    <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="size-full px-3 py-1 gap-1">
      <div className="flex justify-between items-center w-full">
        <div className="flex flex-1 justify-start">
          {/* <Combobox value={selectedStrategy?.name} values={strategies.map(s => s.name)} onCreate={handleCreateStrategy} onChange={(value) => handleOnChangeStrategy(value)} isLoading={isLoading} disabled={!user?.id || user?.id !== selectedStrategy?.user} alwaysSelected={true} variant={"ghost"} size={"sm"} width={"230px"} placeholder={"Strategy"} icon={<History />} onEdit={handleRenameStrategy} onDelete={() => setOpenDeleteDialog(true)} /> */}
          <Combobox searchable={false} alwaysSelected={true} variant={"outline"} size={"sm"} width={"200px"} placeholder={"Select a run"} icon={<History />} />
        </div>
        <div className="flex flex-none justify-center">
          <div className="flex flex-wrap items-center h-auto">
            <TabsList className="flex flex-wrap h-auto bg-transparent gap-1 p-0" style={{ marginTop: '0' }}>
              <TabsTrigger value="order-conditions">
                Order conditions
              </TabsTrigger>
              <TabsTrigger value="performance">
                Performance
              </TabsTrigger>
              <TabsTrigger value="trades-table">
                List of trades
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        <div className="flex flex-1 justify-end">
          {user?.id === selectedStrategy?.user && (
            <Button size="sm" onClick={handlePublish} disabled={isLoading} className="w-fit">
              {isLoading ? (
                <Loader2 className="animate-spin mx-6.5" />
              ) : (
                selectedStrategy?.is_public ? "Unpublish" : "\u00A0\u00A0Publish\u00A0\u00A0"
              )}
            </Button>
          )}
        </div>
      </div>
      <Separator />
      <TabsContent className="" value="order-conditions"><OrderConditions /></TabsContent>
      <TabsContent className="" value="performance"><Performance /></TabsContent>
      <TabsContent className="" value="trades-table"><TradesTable /></TabsContent>
    </Tabs >
  );
}
