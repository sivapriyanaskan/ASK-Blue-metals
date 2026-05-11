import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  label: string;
  /**
   * Logical camera id configured on the API (e.g. 'front', 'top').
   * When provided, the component shows the live MJPEG feed proxied from
   * the RTSP source and captures via the backend snapshot endpoint.
   * Omit to fall back to the legacy mock-capture mode.
   */
  cameraId?: string;
  onCapture?: (imageData: string) => void;
  autoCapture?: boolean;
  externalCaptured?: boolean;
  hideControls?: boolean;
}

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000/api/v1';

export const CameraCapture = ({
  label,
  cameraId,
  onCapture,
  autoCapture = false,
  externalCaptured = false,
  hideControls = false,
}: CameraCaptureProps) => {
  const [captured, setCaptured] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [busy, setBusy] = useState(false);
  // Cache-buster used to retry the MJPEG <img> on demand.
  const [streamNonce, setStreamNonce] = useState(() => Date.now());
  // Stream is paused only when the tab itself is hidden. When the user
  // navigates to another route, this component unmounts and the cleanup
  // effect below tears the connection down completely.
  const [tabVisible, setTabVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true,
  );
  // True until the first MJPEG frame is rendered, so we can show a loader.
  const [streamLoading, setStreamLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastTriggeredRef = useRef(false);

  const liveUrl = cameraId && tabVisible
    ? `${API_BASE}/cameras/${encodeURIComponent(cameraId)}/stream.mjpg?t=${streamNonce}`
    : null;

  // Reset the loader whenever the live URL changes (mount, retry, resume).
  useEffect(() => {
    if (liveUrl) setStreamLoading(true);
  }, [liveUrl]);

  const doCapture = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (cameraId) {
        // Server saves JPEG to disk and returns just the URL — keeps the
        // token-create JSON payload tiny (no base64 in the request body).
        const res = await fetch(
          `${API_BASE}/cameras/${encodeURIComponent(cameraId)}/capture`,
          { method: 'POST', credentials: 'include' },
        );
        if (!res.ok) throw new Error(`Capture failed (${res.status})`);
        const json = (await res.json()) as { url: string };
        // Resolve relative `/uploads/...` URL against the API origin so the
        // <img> tag works regardless of the frontend port.
        const apiOrigin = new URL(API_BASE).origin;
        const fullUrl = json.url.startsWith('http')
          ? json.url
          : `${apiOrigin}${json.url}`;
        setImageData(fullUrl);
        setCaptured(true);
        onCapture?.(json.url);
      } else {
        // Legacy mock fallback when no camera is wired.
        const mock = `mock://snapshot/${Date.now()}`;
        setImageData(mock);
        setCaptured(true);
        onCapture?.(mock);
      }
    } catch (err) {
      console.error('Camera capture failed', err);
      setStreamError(true);
    } finally {
      setBusy(false);
    }
  };

  // Auto-trigger capture when the parent flips the externalCaptured flag.
  useEffect(() => {
    if (externalCaptured && !lastTriggeredRef.current) {
      lastTriggeredRef.current = true;
      void doCapture();
    }
    if (!externalCaptured) lastTriggeredRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCaptured]);

  // Auto-capture once the live feed is up, if requested.
  useEffect(() => {
    if (autoCapture && cameraId && !captured && !busy) {
      const t = setTimeout(() => void doCapture(), 800);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture, cameraId]);

  // Forcefully detach an MJPEG <img>. Setting `src=''` is NOT reliable for
  // `multipart/x-mixed-replace` — most browsers keep the socket open. We
  // must navigate to `about:blank`, then remove the attribute, then unmount.
  const teardownImg = () => {
    const img = imgRef.current;
    if (!img) return;
    try {
      img.onload = null;
      img.onerror = null;
      img.src = 'about:blank';
      img.removeAttribute('src');
    } catch { /* noop */ }
  };

  // Pause/resume the stream based on tab visibility.
  useEffect(() => {
    const handler = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // When the tab is hidden, force the browser to tear down the existing
  // connection so ffmpeg on the server exits promptly.
  useEffect(() => {
    if (!tabVisible) teardownImg();
  }, [tabVisible]);

  // On unmount (route change), tear down synchronously BEFORE React removes
  // the <img> from the DOM. useLayoutEffect cleanup runs synchronously
  // before the DOM mutation, which is what we need to guarantee the socket
  // closes immediately.
  useLayoutEffect(() => {
    return () => {
      teardownImg();
    };
  }, []);

  const handleReset = () => {
    setCaptured(false);
    setImageData(null);
    setStreamError(false);
    setStreamNonce(Date.now());
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden h-full flex flex-col">
      <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-gray-600" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        {captured && <CheckCircle2 className="w-4 h-4 text-green-600" />}
        {streamError && !captured && (
          <AlertCircle className="w-4 h-4 text-red-600" aria-label="Camera offline" />
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          {captured && imageData ? (
            <div className="w-full aspect-video bg-black rounded overflow-hidden relative">
              <img
                src={imageData}
                alt={`${label} capture`}
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-1 right-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          ) : liveUrl && !streamError ? (
            <div className="w-full aspect-video bg-black rounded overflow-hidden relative">
              <img
                ref={imgRef}
                key={streamNonce}
                src={liveUrl}
                alt={`${label} live feed`}
                className="w-full h-full object-contain"
                onLoad={() => setStreamLoading(false)}
                onError={() => setStreamError(true)}
              />
              {streamLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <div className="text-center px-2">
                    <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-1 animate-spin" />
                    <div className="text-xs text-gray-300">Connecting to camera…</div>
                  </div>
                </div>
              )}
            </div>
          ) : cameraId && !tabVisible && !streamError ? (
            <div className="w-full aspect-video bg-gray-900 rounded flex items-center justify-center">
              <div className="text-center px-2">
                <Camera className="w-8 h-8 text-gray-600 mx-auto mb-1" />
                <div className="text-xs text-gray-500">Stream paused</div>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-gray-900 rounded flex items-center justify-center">
              <div className="text-center px-2">
                {streamError ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-1" />
                    <div className="text-xs text-red-300">Camera unreachable</div>
                    <button
                      onClick={() => {
                        setStreamError(false);
                        setStreamNonce(Date.now());
                      }}
                      className="text-[10px] text-blue-300 underline mt-1"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-600 mx-auto mb-1" />
                    <div className="text-xs text-gray-500">
                      {cameraId ? 'Connecting…' : 'Camera Feed'}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {!hideControls && (
          <div className="mt-2">
            {!captured ? (
              <button
                onClick={doCapture}
                disabled={busy || (cameraId !== undefined && streamError)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-1.5 rounded font-medium text-xs transition-colors"
              >
                {busy ? 'Capturing…' : 'Capture'}
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-1.5 rounded font-medium text-xs transition-colors"
              >
                Retake
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
