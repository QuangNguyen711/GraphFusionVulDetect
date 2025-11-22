import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FileUpload } from "@/components/FileUpload";
import Header from "@/components/Header";
import { Shield, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ file: File; content: string } | null>(null);

  const handleFileSelect = (file: File, content: string) => {
    setSelectedFile({ file, content });
  };

  const handleAnalyze = () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a Solidity file");
      return;
    }

    // Store in sessionStorage, including the actual file object
    sessionStorage.setItem(
      "contractAnalysis",
      JSON.stringify({
        projectName: projectName.trim(),
        fileName: selectedFile.file.name,
        file: selectedFile.content, // Keep content for backward compatibility
        fileSize: selectedFile.file.size,
        lastModified: selectedFile.file.lastModified,
      })
    );

    // Store the actual file in a separate key since File objects don't serialize well
    sessionStorage.setItem("contractFile", selectedFile.content);

    toast.success("Starting analysis...");
    navigate("/analysis");
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

          <div className="space-y-2">
            <Label className="text-lg font-semibold">Upload Contract</Label>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>

          <Button
            onClick={handleAnalyze}
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary shadow-glow hover:shadow-glow transition-smooth"
            disabled={!projectName.trim() || !selectedFile}
          >
            Start Analysis
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
