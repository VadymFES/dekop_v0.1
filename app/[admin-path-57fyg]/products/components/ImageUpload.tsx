'use client';

/**
 * ImageUpload Component
 *
 * Drag-and-drop image upload using Vercel Blob server uploads.
 * Features:
 * - Drag and drop support
 * - Upload progress indicator
 * - Image preview
 * - File validation (type, size)
 * - Delete functionality
 *
 * @see https://vercel.com/docs/vercel-blob/server-upload
 */

import { useState, useRef, useCallback } from 'react';
import styles from './ImageUpload.module.css';

interface UploadedImage {
  url: string;
  alt: string;
  is_primary: boolean;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, uploadId: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            setUploading((prev) =>
              prev.map((u) =>
                u.id === uploadId ? { ...u, progress: percentage } : u
              )
            );
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success && response.url) {
                resolve(response.url);
              } else {
                reject(new Error(response.error || 'Upload failed'));
              }
            } catch {
              reject(new Error('Invalid response'));
            }
          } else {
            try {
              const response = JSON.parse(xhr.responseText);
              reject(new Error(response.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    } catch (error) {
      throw error;
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Check max images limit
      if (images.length + fileArray.length > maxImages) {
        alert(`Максимум ${maxImages} зображень дозволено`);
        return;
      }

      // Validate files
      const validFiles = fileArray.filter((file) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const maxSize = 4 * 1024 * 1024; // 4MB

        if (!validTypes.includes(file.type)) {
          alert(`${file.name}: Непідтримуваний формат. Дозволені: JPEG, PNG, WebP, GIF`);
          return false;
        }

        if (file.size > maxSize) {
          alert(`${file.name}: Файл занадто великий. Максимум 4MB`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) return;

      // Create uploading state for each file
      const uploadingFiles: UploadingFile[] = validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploading((prev) => [...prev, ...uploadingFiles]);

      // Upload files
      const uploadPromises = validFiles.map(async (file, index) => {
        const uploadId = uploadingFiles[index].id;

        try {
          const url = await uploadFile(file, uploadId);

          // Mark as completed
          setUploading((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: 'completed', progress: 100 } : u
            )
          );

          return {
            url: url!,
            alt: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for alt
            is_primary: images.length === 0 && index === 0, // First image is primary if no images exist
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Помилка завантаження';
          setUploading((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: 'error', error: errorMessage } : u
            )
          );
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((r): r is UploadedImage => r !== null);

      if (successfulUploads.length > 0) {
        onImagesChange([...images, ...successfulUploads]);
      }

      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploading((prev) => prev.filter((u) => u.status === 'uploading'));
      }, 2000);
    },
    [images, onImagesChange, maxImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const handleRemoveImage = useCallback(
    async (index: number) => {
      const imageToRemove = images[index];

      // Try to delete from Blob storage if it's a Vercel Blob URL
      if (imageToRemove.url.includes('blob.vercel-storage.com')) {
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(imageToRemove.url)}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Failed to delete from Blob:', error);
        }
      }

      const newImages = images.filter((_, i) => i !== index);

      // If we removed the primary image, make the first one primary
      if (imageToRemove.is_primary && newImages.length > 0) {
        newImages[0].is_primary = true;
      }

      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  const handleSetPrimary = useCallback(
    (index: number) => {
      const newImages = images.map((img, i) => ({
        ...img,
        is_primary: i === index,
      }));
      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  const handleAltChange = useCallback(
    (index: number, alt: string) => {
      const newImages = [...images];
      newImages[index] = { ...newImages[index], alt };
      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  return (
    <div className={styles.container}>
      {/* Drop Zone */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className={styles.fileInput}
        />
        <div className={styles.dropZoneContent}>
          <div className={styles.uploadIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className={styles.dropZoneText}>
            Перетягніть зображення сюди або клікніть для вибору
          </p>
          <p className={styles.dropZoneHint}>
            JPEG, PNG, WebP, GIF (макс. 4MB)
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading.length > 0 && (
        <div className={styles.uploadingList}>
          {uploading.map((file) => (
            <div key={file.id} className={styles.uploadingItem}>
              <span className={styles.uploadingName}>{file.name}</span>
              {file.status === 'uploading' && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              )}
              {file.status === 'completed' && (
                <span className={styles.uploadSuccess}>Завантажено</span>
              )}
              {file.status === 'error' && (
                <span className={styles.uploadError}>{file.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className={styles.imageGrid}>
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className={`${styles.imageCard} ${image.is_primary ? styles.imageCardPrimary : ''}`}
            >
              <div className={styles.imagePreview}>
                <img src={image.url} alt={image.alt || 'Product image'} />
                {image.is_primary && (
                  <span className={styles.primaryBadge}>Головне</span>
                )}
              </div>
              <div className={styles.imageActions}>
                <input
                  type="text"
                  value={image.alt}
                  onChange={(e) => handleAltChange(index, e.target.value)}
                  placeholder="Alt текст"
                  className={styles.altInput}
                />
                <div className={styles.imageButtons}>
                  {!image.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(index)}
                      className={styles.setPrimaryBtn}
                      title="Зробити головним"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className={styles.removeBtn}
                    title="Видалити"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && uploading.length === 0 && (
        <p className={styles.noImages}>Немає зображень</p>
      )}
    </div>
  );
}
