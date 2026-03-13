import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import Header from "@/components/Header";
import { Shield, Sparkles, Zap, Loader2, Search } from "lucide-react";
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
      navigate("/analysis");
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="gradient-hero border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl shadow-glow mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            
            <h1 className="text-5xl font-bold text-foreground">
              Smart Contract Analyzer
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your Solidity contracts for comprehensive security analysis
              with real-time streaming results
            </p>

            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Real-time Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="text-sm text-muted-foreground">AI-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-success" />
                <span className="text-sm text-muted-foreground">Security First</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Card className="glass p-8 space-y-8">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-lg font-semibold">
              Project Name
            </Label>
            <Input
              id="project-name"
              placeholder="e.g., DeFi Protocol Audit"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          <Tabs defaultValue="upload" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="search">Search Token</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-lg font-semibold">Upload Contract</Label>
                <FileUpload onFileSelect={handleFileSelect} />
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
                 <div className="flex gap-2">
                    <Input 
                        placeholder="Search token due name or symbol (e.g. USDC, Uniswap)" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTokenSearch()}
                    />
                    <Button onClick={handleTokenSearch} disabled={isSearching} variant="outline" size="icon">
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                 </div>
                 
                 {searchResults.length > 0 && (
                     <div className="grid gap-2 max-h-60 overflow-y-auto border p-2 rounded-md bg-background/50">
                        {searchResults.map(token => (
                            <div 
                                key={token.id} 
                                className={`p-2 cursor-pointer hover:bg-accent rounded flex items-center gap-3 transition-colors ${selectedToken?.id === token.id ? 'bg-primary/20 border-primary border' : ''}`}
                                onClick={() => handleSelectToken(token)}
                            >
                                {token.thumb && <img src={token.thumb} className="w-8 h-8 rounded-full" alt={token.symbol} />}
                                <div>
                                    <div className="font-bold">{token.symbol.toUpperCase()}</div>
                                    <div className="text-xs text-muted-foreground">{token.name}</div>
                                </div>
                            </div>
                        ))}
                     </div>
                 )}
                 
                 {selectedToken && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Select Chain</Label>
                        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select chain" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(tokenPlatforms).map(([chain, address]) => (
                                    <SelectItem key={chain} value={chain}>
                                        <span className="capitalize">{chain}</span> <span className="text-muted-foreground text-xs ml-2">({address.substring(0, 8)}...{address.substring(address.length-6)})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                 )}
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleAnalyze}
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary shadow-glow hover:shadow-glow transition-smooth"
            disabled={!projectName.trim() || isCreatingProject || (activeTab === "upload" ? !selectedFile : (!selectedToken || !selectedPlatform))}
          >
            {isCreatingProject ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Project...
              </>
            ) : (
              "Start Analysis"
            )}
          </Button>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="glass p-6 text-center">
            <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Security Checks</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive vulnerability scanning and best practice validation
            </p>
          </Card>

          <Card className="glass p-6 text-center">
            <Sparkles className="h-10 w-10 text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Smart Analysis</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered detection of complex patterns and potential issues
            </p>
          </Card>

          <Card className="glass p-6 text-center">
            <Zap className="h-10 w-10 text-warning mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Real-time Results</h3>
            <p className="text-sm text-muted-foreground">
              Live streaming analysis with instant feedback and visualization
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
