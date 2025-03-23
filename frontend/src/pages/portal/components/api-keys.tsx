import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Trash, Pencil, CirclePlus, Loader2, EyeClosed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllExchanges, getApiKeysExchanges, createUpdateApiKeys, deleteApiKeys, ApiKey } from "@/api";

export function ApiKeys() {
  const { toast } = useToast();
  const [apiKeysExchanges, setApiKeysExchanges] = useState([]);
  const [allExchanges, setAllExchanges] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [filteredMoreExchanges, setFilteredMoreExchanges] = useState([]);
  const [filteredApiKeysExchanges, setFilteredApiKeysExchanges] = useState([]);
	const [openCreateUpdateDialog, setOpenCreateUpdateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
	const [selectedExchange, setSelectedExchange] = useState(null);
  const [apiKey, setApiKey] = useState("");
	const [secret, setSecret] = useState("");
	const [password, setPassword] = useState("");
	const [uid, setUid] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getAllExchanges()
      .then((res) => setAllExchanges(res.data))
      .catch((error) => console.error("Error fetching exchanges:", error));
    getApiKeysExchanges()
      .then((res) => setApiKeysExchanges(res.data))
      .catch((error) => console.error("Error fetching exchanges:", error));
  }, []);

  useEffect(() => {
    const newFilteredApiKeysExchanges = apiKeysExchanges.filter((exchange) =>
      exchange.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredApiKeysExchanges(newFilteredApiKeysExchanges);
    setFilteredMoreExchanges(
      allExchanges.filter((exchange) =>
        exchange.toLowerCase().includes(searchValue.toLowerCase()) &&
        !newFilteredApiKeysExchanges.includes(exchange)
      )
    );
  }, [searchValue, apiKeysExchanges]);

	const handleCloseCreateUpdateDialog = () => {
		setOpenCreateUpdateDialog(false);
    setSelectedExchange(null);
		setApiKey("");
		setSecret("");
		setPassword("");
		setUid("");
	};

  const handleSave = async () => {
    try {
      setIsLoading(true);
      if (!apiKey && !secret && !password && !uid) {
        toast({ title: "Error", description: "At least one field must be filled" });
        return;
      }
      const apiKeyData: ApiKey = {
        exchange: selectedExchange,
        api_key: apiKey,
        secret: secret,
        password: password,
        uid: uid,
      };
      await createUpdateApiKeys(apiKeyData);
      setApiKeysExchanges((prev) => prev.includes(selectedExchange) ? prev : [...prev, selectedExchange]);
			setOpenCreateUpdateDialog(false);
      setSelectedExchange(null);
			setApiKey("");
			setSecret("");
			setPassword("");
			setUid("");
      toast({ description: "API Keys saved successfully" });
    } catch (error) {
      toast({ title: "Failed to create or update API keys", description: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteApiKeys(selectedExchange);
      setApiKeysExchanges((prev) => prev.filter((exchange) => exchange !== selectedExchange));
      setOpenDeleteDialog(false);
      setSelectedExchange(null);
			setApiKey("");
			setSecret("");
			setPassword("");
			setUid("");
      toast({ description: "API Key deleted successfully" });
    } catch (error) {
      toast({ title: "Failed to delete API key", description: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="relative w-[60%] mx-auto my-1">
        <Input
          type="search"
          placeholder="Search exchanges..."
          className="w-full pr-8"
          maxLength={50}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <Search className="absolute size-4 right-3 top-1/2 transform -translate-y-1/2 text-input" />
      </div>

      <h2>Your API Keys</h2>
      {filteredApiKeysExchanges.length === 0 ? (
        <div className="flex justify-center items-center h-20 text-lg text-muted-foreground">
          No API keys found. Add one below.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-4">
          {filteredApiKeysExchanges.map((exchange) => (
            <Card key={exchange} className="shadow-md">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center text-lg capitalize break-all">
                  {exchange}
                  <div className="ml-auto">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setSelectedExchange(exchange);
											setOpenCreateUpdateDialog(true);
										}}>
                      <Pencil className="text-primary"/>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setSelectedExchange(exchange);
											setOpenDeleteDialog(true);
										}}>
                      <Trash className="text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <h2>More Exchanges</h2>
      {filteredMoreExchanges.length === 0 ? (
        <div className="flex justify-center items-center h-20 text-lg text-muted-foreground">
          No available exchanges found.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-4">
          {filteredMoreExchanges.map((exchange) => (
            <Card key={exchange} className="shadow-md">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center text-lg capitalize break-all">
                  {exchange}
                  <div className="ml-auto">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setOpenCreateUpdateDialog(true);
                      setSelectedExchange(exchange);
                    }}>
                      <CirclePlus className="text-primary"/>
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openCreateUpdateDialog} onOpenChange={handleCloseCreateUpdateDialog}>
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Set <span className="capitalize">{selectedExchange}</span> API Keys
            </DialogTitle>
            <DialogDescription>
              Current keys are hidden for security. It is usually not necessary to fill in all of them.
            </DialogDescription>
          </DialogHeader>

          <Label>API Key</Label>
					<div className="relative w-full">
						<Input
	            id="apiKey"
            	type="password"
              maxLength={512}
            	value={apiKey}
            	onChange={(e) => setApiKey(e.target.value)}
							className="pr-10"
          	/>
						<EyeClosed size={16} className="absolute top-3 right-3 flex items-center text-muted" />
					</div>

					<Label>Secret</Label>
					<div className="relative w-full">
						<Input
	            id="secret"
            	type="password"
              maxLength={512}
            	value={secret}
            	onChange={(e) => setSecret(e.target.value)}
							className="pr-10"
          	/>
						<EyeClosed size={16} className="absolute top-3 right-3 flex items-center text-muted" />
					</div>

					<Label>Password</Label>
					<div className="relative w-full">
						<Input
	            id="password"
            	type="password"
              maxLength={512}
            	value={password}
            	onChange={(e) => setPassword(e.target.value)}
							className="pr-10"
          	/>
						<EyeClosed size={16} className="absolute top-3 right-3 flex items-center text-muted" />
					</div>

					<Label>UID</Label>
					<div className="relative w-full">
						<Input
	            id="uid"
            	type="password"
              maxLength={512}
            	value={uid}
            	onChange={(e) => setUid(e.target.value)}
							className="pr-10"
          	/>
						<EyeClosed size={16} className="absolute top-3 right-3 flex items-center text-muted" />
					</div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteDialog} onOpenChange={() => {
        setOpenDeleteDialog(false);
        setSelectedExchange(null);
      }}>
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Confirm <span className="capitalize">{selectedExchange}</span> API Key Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API Key?
              This action cannot be undone, and you will lose access to the integration with this exchange.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
