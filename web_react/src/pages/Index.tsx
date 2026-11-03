import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import Header from "@/components/Header";
import { Loader2, Search } from "lucide-react";
import { PipelineTrail } from "@/components/Pipeline";
import { toast } from "sonner";
import { projectService } from "@/services/project";
import { tokenService, TokenSearchResult } from "@/services/token";

const Index = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ file: File; content: string } | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Token Search State
  const [activeTab, setActiveTab] = useState("upload");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenSearchResult | null>(null);
  const [tokenPlatforms, setTokenPlatforms] = useState<Record<string, string>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");

  const handleFileSelect = (file: File, content: string) => {
    setSelectedFile({ file, content });
  };

  const handleTokenSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setSelectedToken(null);
    setTokenPlatforms({});
    setSelectedPlatform("");
    
    try {
        const results = await tokenService.searchTokens(searchQuery);
        setSearchResults(results);
    } catch (e) {
        toast.error("Failed to search token");
    } finally {
        setIsSearching(false);
    }
  };
  
  const handleSelectToken = async (token: TokenSearchResult) => {
      setSelectedToken(token);
      setSelectedPlatform("");
      try {
          const platforms = await tokenService.getPlatforms(token.id);
          setTokenPlatforms(platforms);
          const keys = Object.keys(platforms);
          if (keys.length > 0) setSelectedPlatform(keys[0]);
      } catch (e) {
          toast.error("Failed to load platforms");
      }
  };

  const handleAnalyze = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    let fileToUse = selectedFile;
    
    if (activeTab === "search") {
        if (!selectedToken || !selectedPlatform) {
            toast.error("Please select a token and chain");
            return;
        }
        
        setIsCreatingProject(true);
        try {
            const address = tokenPlatforms[selectedPlatform];
            const tokenData = await tokenService.analyzeToken(selectedPlatform, address, selectedToken.name);
            
            const blob = new Blob([tokenData.source_code], { type: 'text/plain' });
            const file = new File([blob], tokenData.file_name, { lastModified: Date.now() });
            
            fileToUse = { 
                file: file, 
                content: tokenData.source_code 
            };
        } catch (e) {
             toast.error("Failed to fetch source code");
             setIsCreatingProject(false);
             return;
        }
    } else {
        if (!fileToUse) {
            toast.error("Please select a Solidity file");
            return;
        }
        setIsCreatingProject(true);
    }
    
    try {
      // First create the project in the backend
      const project = await projectService.createProject({
        name: projectName.trim(),
        description: `Analysis project for ${fileToUse!.file.name}`
      });

      // Store project and file information
      sessionStorage.setItem(
        "contractAnalysis",
        JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          fileName: fileToUse!.file.name,
          fileSize: fileToUse!.file.size,
          lastModified: fileToUse!.file.lastModified,
        })
      );

      // Store the actual file content
      sessionStorage.setItem("contractFile", fileToUse!.content);

      toast.success("Project created successfully!");
      navigate("/analysis/live");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Failed to create project. Please try again."
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  const startDisabled = !projectName.trim() || isCreatingProject || (activeTab === "upload" ? !selectedFile : (!selectedToken || !selectedPlatform));

  return (
    <div className="min-h-dvh bg-background">
      <Header />

      <main id="main" className="shell grid gap-12 py-12 lg:grid-cols-12 lg:gap-8 lg:py-16">
        <div className="lg:col-span-5">
          <h1 className="text-4xl leading-none sm:text-5xl">Smart Contract Analyzer</h1>
          <p className="mt-4 max-w-[44ch] text-lg text-ink-2">
            Upload your Solidity contracts for comprehensive security analysis with real-time streaming results
          </p>
          <div className="mt-10 border-t border-rule pt-8">
            <h2 className="mb-6 text-sm text-muted-foreground">What runs on your contract</h2>
            <PipelineTrail preview />
          </div>
        </div>

        <section className="panel p-6 sm:p-8 lg:col-span-7" aria-labelledby="new-analysis-head">
          <h2 id="new-analysis-head" className="sr-only">New Analysis</h2>
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g., DeFi Protocol Audit"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <Tabs defaultValue="upload" onValueChange={setActiveTab} className="mt-8 w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="search">Search Token</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6 space-y-2">
              <Label>Upload Contract</Label>
              <FileUpload onFileSelect={handleFileSelect} />
            </TabsContent>

            <TabsContent value="search" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token-search">Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="token-search"
                    placeholder="Search token by name or symbol (e.g. USDC, Uniswap)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTokenSearch()}
                  />
                  <Button onClick={handleTokenSearch} disabled={isSearching} variant="outline" size="icon" aria-label="Search token" aria-busy={isSearching}>
                    {isSearching ? <Loader2 className="keep-motion h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <ul className="max-h-60 divide-y divide-rule overflow-y-auto rounded-md border border-rule" aria-label="Search results">
                  {searchResults.map(token => (
                    <li key={token.id}>
                      <button
                        type="button"
                        aria-pressed={selectedToken?.id === token.id}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-200 hover:bg-paper-3 ${selectedToken?.id === token.id ? 'bg-signal-soft' : ''}`}
                        onClick={() => handleSelectToken(token)}
                      >
                        {token.thumb && <img src={token.thumb} width={28} height={28} className="h-7 w-7 rounded-full" alt="" />}
                        <span>
                          <span className="block text-sm text-ink">{token.symbol.toUpperCase()}</span>
                          <span className="block text-xs text-muted-foreground">{token.name}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selectedToken && (
                <div className="land space-y-2">
                  <Label>Select Chain</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger aria-label="Chain">
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tokenPlatforms).map(([chain, address]) => (
                        <SelectItem key={chain} value={chain}>
                          <span className="capitalize">{chain}</span>{' '}
                          <span className="code-text ml-2 text-xs text-muted-foreground">{address.substring(0, 8)}…{address.substring(address.length-6)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-rule pt-6">
            <Button
              onClick={handleAnalyze}
              size="lg"
              disabled={startDisabled}
              aria-busy={isCreatingProject}
            >
              {isCreatingProject ? (
                <>
                  <Loader2 className="keep-motion h-4 w-4 animate-spin" />
                  Creating Project…
                </>
              ) : (
                "Start Analysis"
              )}
            </Button>
            {startDisabled && !isCreatingProject && (
              <p className="text-sm text-muted-foreground">
                {!projectName.trim() ? "Name the project first." : activeTab === "upload" ? "Choose a .sol file." : "Pick a token and its chain."}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
