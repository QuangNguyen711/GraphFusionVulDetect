import { useCallback, useState } from "react";
import { Upload, File, AlertCircle, Loader2, CheckCircle } from "lucide-react";
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
    <div className="space-y-3">
      <div
        className={`rounded-md border border-dashed transition-colors duration-200 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${
          isDragging
            ? "border-signal bg-signal-soft"
            : "border-rule-2 bg-paper-3 hover:border-muted-foreground"
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
          className="flex cursor-pointer items-center gap-4 rounded-md p-5 sm:p-6"
        >
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-rule-2 text-muted-foreground" aria-hidden="true">
            {uploadedFileInfo ? (
              <CheckCircle className="h-4 w-4 text-ok" />
            ) : selectedFile ? (
              <File className="h-4 w-4 text-signal" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0">
            <span className={`block break-all text-base ${selectedFile ? "code-text text-sm text-ink" : "text-ink"}`}>
              {uploadedFileInfo
                ? `Uploaded: ${uploadedFileInfo.filename}`
                : selectedFile
                ? selectedFile.name
                : "Upload Smart Contract"}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {uploadedFileInfo
                ? "File uploaded successfully. Ready for analysis."
                : selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB. Drop another file to replace it.`
                : "Drag and drop your smart contract file here, or click to browse"}
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              {supportedTypes.join(', ')}, max 10&nbsp;MB
            </span>
          </span>
        </label>

        <input
          id="file-upload"
          type="file"
          accept={supportedTypes.join(',')}
          onChange={handleChange}
          className="sr-only"
        />
      </div>

      {isUploading && (
        <div className="space-y-2" role="status">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span className="measured">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-bad-soft p-3 text-sm text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {uploadedFileInfo && (
        <dl className="grid grid-cols-3 gap-3 rounded-md bg-ok-soft p-3 text-sm">
          <div><dt className="text-muted-foreground">File</dt><dd className="code-text break-all text-xs text-ink">{uploadedFileInfo.filename}</dd></div>
          <div><dt className="text-muted-foreground">Size</dt><dd className="measured text-ink">{(uploadedFileInfo.file_size / 1024).toFixed(1)} KB</dd></div>
          <div><dt className="text-muted-foreground">Type</dt><dd className="text-ink">{uploadedFileInfo.file_type}</dd></div>
        </dl>
      )}
    </div>
  );
};
