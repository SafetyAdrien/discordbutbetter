import { useState, useCallback } from 'react';

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  description: string;
  isSpoiler: boolean;
}

export function usePendingAttachments() {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: PendingAttachment[] = fileArray
      .filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        description: '',
        isSpoiler: false,
      }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const updateAttachment = useCallback((id: string, updates: Partial<Pick<PendingAttachment, 'name' | 'description' | 'isSpoiler'>>) => {
    setAttachments(prev => prev.map(a => 
      a.id === id ? { ...a, ...updates } : a
    ));
  }, []);

  const toggleSpoiler = useCallback((id: string) => {
    setAttachments(prev => prev.map(a => 
      a.id === id ? { ...a, isSpoiler: !a.isSpoiler } : a
    ));
  }, []);

  const clearAttachments = useCallback(() => {
    attachments.forEach(a => URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
  }, [attachments]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone completely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  return {
    attachments,
    isDragging,
    addFiles,
    removeAttachment,
    updateAttachment,
    toggleSpoiler,
    clearAttachments,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
