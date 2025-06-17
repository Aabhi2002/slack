
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, onFileRemove, selectedFile, disabled }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      onFileSelect(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        disabled={disabled}
      />
      
      {selectedFile ? (
        <div className="flex items-center gap-2 bg-slate-700 rounded px-3 py-1 text-sm">
          <span className="text-slate-300">{selectedFile.name}</span>
          <span className="text-slate-400">({formatFileSize(selectedFile.size)})</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onFileRemove}
            className="h-5 w-5 p-0 text-slate-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
