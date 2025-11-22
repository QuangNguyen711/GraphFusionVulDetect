import { useCallback, useState } from "react";
import { Upload, File, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import AnalysisService, { FileInfo } from "@/services/analysis";

interface FileUploadProps {
  onFileSelect: (file: File, content: string) => void;
  onAnalysisStart?: (fileInfo: FileInfo) => void;
  onAnalysisComplete?: (results: any) => void;
}

export const FileUpload = ({ onFileSelect, onAnalysisStart, onAnalysisComplete }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<FileInfo | null>(null);

  const validateFile = (file: File): boolean => {
    setError("");
    
    const validation = AnalysisService.validateFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return false;
    }

    return true;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    try {
      const content = await file.text();
      setSelectedFile(file);
      onFileSelect(file, content);
    } catch (err) {
      setError("Failed to read file");
      console.error("File read error:", err);
    }
  }, [onFileSelect]);

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      const results = await AnalysisService.uploadAndAnalyze(
        selectedFile,
        'full',
        (progress) => setUploadProgress(progress)
      );

      // Simulate additional progress for analysis
      setUploadProgress(100);
      
      toast.success("File uploaded and analysis completed!");
      onAnalysisComplete?.(results);
    } catch (error: any) {
      console.error("Upload and analysis error:", error);
      setError(error.message || "Upload and analysis failed");
      toast.error("Upload and analysis failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadOnly = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      setUploadProgress(50);
      const fileInfo = await AnalysisService.uploadFile(selectedFile);
      setUploadProgress(100);
      
      setUploadedFileInfo(fileInfo);
      toast.success("File uploaded successfully!");
      onAnalysisStart?.(fileInfo);
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || "Upload failed");
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const supportedTypes = AnalysisService.getSupportedFileTypes();

  return (
    <div className="space-y-4">
      <Card
        className={`relative overflow-hidden transition-smooth ${
          isDragging
            ? "border-primary bg-primary/5 shadow-glow"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center p-12 cursor-pointer"
        >
          <div className={`transition-smooth ${isDragging ? "scale-110" : ""}`}>
            {uploadedFileInfo ? (
              <CheckCircle className="h-16 w-16 text-success mb-4" />
            ) : selectedFile ? (
              <File className="h-16 w-16 text-primary mb-4" />
            ) : (
              <Upload className="h-16 w-16 text-primary mb-4" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {uploadedFileInfo 
              ? `Uploaded: ${uploadedFileInfo.filename}`
              : selectedFile 
              ? selectedFile.name 
              : "Upload Smart Contract"
            }
          </h3>
          
          <p className="text-muted-foreground text-center mb-4">
            {uploadedFileInfo
              ? "File uploaded successfully. Ready for analysis."
              : selectedFile 
              ? "File selected. Click upload to continue."
              : "Drag and drop your smart contract file here, or click to browse"
            }
          </p>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-3 py-1 bg-muted rounded-md">{supportedTypes.join(', ')}</span>
            <span className="px-3 py-1 bg-muted rounded-md">Max 10MB</span>
          </div>
        </label>
        
        <input
          id="file-upload"
          type="file"
          accept={supportedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
        />
      </Card>

      {isUploading && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        </Card>
      )}

      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </Card>
      )}

      {uploadedFileInfo && (
        <Card className="border-success bg-success/10 p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="font-medium text-success">File uploaded successfully</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>File: {uploadedFileInfo.filename}</p>
              <p>Size: {(uploadedFileInfo.file_size / 1024).toFixed(1)} KB</p>
              <p>Type: {uploadedFileInfo.file_type}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
