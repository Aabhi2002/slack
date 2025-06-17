
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image } from 'lucide-react';

interface Attachment {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number | null;
}

interface MessageAttachmentProps {
  attachment: Attachment;
}

export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const [imageError, setImageError] = useState(false);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.file_url;
    link.download = attachment.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = attachment.file_type.startsWith('image/');

  if (isImage && !imageError) {
    return (
      <div className="mt-2 max-w-sm">
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          className="rounded-lg max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
          onError={() => setImageError(true)}
          onClick={() => window.open(attachment.file_url, '_blank')}
        />
        <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
          <span>{attachment.file_name}</span>
          {attachment.file_size && <span>{formatFileSize(attachment.file_size)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 bg-slate-700 rounded-lg p-3 max-w-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
          {isImage ? (
            <Image className="w-5 h-5 text-slate-300" />
          ) : (
            <FileText className="w-5 h-5 text-slate-300" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">{attachment.file_name}</div>
          <div className="text-xs text-slate-400">
            {attachment.file_size && formatFileSize(attachment.file_size)}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-600"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
