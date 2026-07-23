import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../utils/constants';

export interface UploadProgress {
  uploadId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  images?: unknown[];
  photoUrl?: string;
}

interface UploadProgressTrackerProps {
  uploadId: string;
  onComplete?: (result: UploadProgress) => void;
  onError?: (error: string) => void;
}

/**
 * Hook that subscribes to SSE progress events for a given uploadId.
 * Automatically closes the EventSource on cleanup, completion, or error.
 */
export const useUploadProgress = (
  uploadId: string | null,
  onComplete?: (result: UploadProgress) => void,
  onError?: (error: string) => void,
) => {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!uploadId) return;

    const eventSource = new EventSource(`${API_BASE_URL}/upload/progress/${uploadId}`, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        // Handle wrapped format from TransformInterceptor (defensive)
        const data = parsed.success === true ? parsed.data : parsed;

        // Parse inner data if it's a JSON string
        const payload = typeof data.data === 'string'
          ? JSON.parse(data.data)
          : data;

        // Ignore heartbeat messages
        if (payload.type === 'heartbeat') return;

        // Validate as UploadProgress
        if (!payload.uploadId) return;

        setProgress(payload);

        if (payload.status === 'completed') {
          onComplete?.(payload);
          eventSource.close();
        } else if (payload.status === 'failed') {
          onError?.(payload.message || 'Upload failed');
          eventSource.close();
        }
      } catch {
        // Ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [uploadId, onComplete, onError]);

  return { progress, isConnected };
};

/**
 * UploadProgressTracker displays a real-time progress bar for background uploads.
 *
 * States:
 * - null progress: Spinner + "Connecting..."
 * - processing: Animated progress bar with message and percentage
 * - completed: Full green progress bar + "Completed"
 * - failed: Full red progress bar + error message
 */
const UploadProgressTracker: React.FC<UploadProgressTrackerProps> = ({
  uploadId,
  onComplete,
  onError,
}) => {
  const { progress, isConnected } = useUploadProgress(uploadId, onComplete, onError);

  // No progress yet — connecting state
  if (!progress) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600" role="status" aria-live="polite">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Connecting...</span>
      </div>
    );
  }

  const barColor =
    progress.status === 'completed'
      ? 'bg-green-500'
      : progress.status === 'failed'
        ? 'bg-red-500'
        : 'bg-primary-600';

  return (
    <div className="w-full" role="progressbar" aria-valuenow={progress.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">
          {progress.status === 'completed'
            ? 'Completed'
      : progress.status === 'failed'
        ? progress.message || 'Upload failed'
        : progress.message || 'Processing...'}
        {progress.status === 'failed' && onError && (
          <button
            onClick={() => onError('')}
            className="ml-2 text-xs text-primary-600 hover:text-primary-800 underline"
          >
            Dismiss
          </button>
        )}
        </span>
        <span className="text-sm text-gray-500">{progress.progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>
      {progress.status === 'processing' && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1" aria-live="polite">
          <span className={isConnected ? 'text-green-500' : 'text-red-500'} aria-hidden="true">
            {isConnected ? '●' : '○'}
          </span>
          {isConnected ? 'Connected' : 'Reconnecting...'}
        </p>
      )}
    </div>
  );
};

export default UploadProgressTracker;
