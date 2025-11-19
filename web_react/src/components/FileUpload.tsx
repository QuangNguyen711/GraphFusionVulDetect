import { useCallback, useState } from "react";
import { Upload, File, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FileUploadProps {
  onFileSelect: (file: File, content: string) => void;
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): boolean => {
    setError("");

    if (!file.name.endsWith(".sol")) {
      setError("Please upload a Solidity (.sol) file");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
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
            {selectedFile ? (
              <File className="h-16 w-16 text-success mb-4" />
            ) : (
              <Upload className="h-16 w-16 text-primary mb-4" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {selectedFile ? selectedFile.name : "Upload Solidity Contract"}
          </h3>
          
          <p className="text-muted-foreground text-center mb-4">
            {selectedFile 
              ? "File selected. You can upload a different file or continue."
              : "Drag and drop your .sol file here, or click to browse"
            }
          </p>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-3 py-1 bg-muted rounded-md">.sol files only</span>
            <span className="px-3 py-1 bg-muted rounded-md">Max 10MB</span>
          </div>
        </label>
        
        <input
          id="file-upload"
          type="file"
          accept=".sol"
          onChange={handleChange}
          className="hidden"
        />
      </Card>

      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </Card>
      )}
    </div>
  );
};
