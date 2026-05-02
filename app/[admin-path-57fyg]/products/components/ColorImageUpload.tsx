'use client';

/**
 * ColorImageUpload Component
 *
 * Upload color swatch images for product color variants.
 * Features:
 * - Click to upload
 * - Confirmation modal before upload
 * - Image preview
 * - File validation
 */

import { useState, useRef, useCallback } from 'react';
import styles from './ColorImageUpload.module.css';

interface ColorImageUploadProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  colorName?: string;
}

interface PendingUpload {
  file: File;
  previewUrl: string;
}

export default function ColorImageUpload({
  imageUrl,
  onImageChange,
  colorName = 'Колір',
}: ColorImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentage);
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

      const baseUrl = window.location.hostname.startsWith('admin.')
        ? window.location.origin.replace('admin.', '')
        : window.location.origin;
      xhr.open('POST', `${baseUrl}/api/upload`);
      xhr.send(formData);
    });
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 2 * 1024 * 1024; // 2MB for color swatches

    if (!validTypes.includes(file.type)) {
      setError('Непідтримуваний формат. Дозволені: JPEG, PNG, WebP, GIF');
      return;
    }

    if (file.size > maxSize) {
      setError('Файл занадто великий. Максимум 2MB');
      return;
    }

    setError(null);

    // Create preview and show confirmation modal
    const previewUrl = URL.createObjectURL(file);
    setPendingUpload({ file, previewUrl });
    setShowConfirmModal(true);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleCancelUpload = useCallback(() => {
    if (pendingUpload) {
      URL.revokeObjectURL(pendingUpload.previewUrl);
    }
    setPendingUpload(null);
    setShowConfirmModal(false);
  }, [pendingUpload]);

  const handleConfirmUpload = useCallback(async () => {
    if (!pendingUpload) return;

    setShowConfirmModal(false);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const url = await uploadFile(pendingUpload.file);
      onImageChange(url);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (pendingUpload) {
        URL.revokeObjectURL(pendingUpload.previewUrl);
      }
      setPendingUpload(null);
    }
  }, [pendingUpload, onImageChange]);

  const handleRemoveImage = useCallback(() => {
    onImageChange('');
  }, [onImageChange]);

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className={styles.fileInput}
      />

      {imageUrl ? (
        <div className={styles.previewContainer}>
          <img src={imageUrl} alt={colorName} className={styles.preview} />
          <div className={styles.previewActions}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.changeBtn}
              disabled={isUploading}
            >
              Змінити
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className={styles.removeBtn}
              disabled={isUploading}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={styles.uploadBtn}
          disabled={isUploading}
        >
          {isUploading ? (
            <span className={styles.uploading}>
              <span className={styles.spinner}></span>
              {uploadProgress}%
            </span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Завантажити</span>
            </>
          )}
        </button>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {/* Confirmation Modal */}
      {showConfirmModal && pendingUpload && (
        <div className={styles.modalOverlay} onClick={handleCancelUpload}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Підтвердження завантаження</h3>

            <div className={styles.modalPreview}>
              <img src={pendingUpload.previewUrl} alt="Preview" />
            </div>

            <p className={styles.modalInfo}>
              Зображення для кольору: <strong>{colorName || 'Без назви'}</strong>
            </p>

            <div className={styles.modalButtons}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={handleCancelUpload}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={handleConfirmUpload}
              >
                Завантажити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
