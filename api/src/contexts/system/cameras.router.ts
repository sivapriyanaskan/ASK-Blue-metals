import { Router, type Request, type Response } from 'express';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import ffmpegStatic from 'ffmpeg-static';
import { config } from '../../infra/config.js';
import { logger } from '../../infra/logger.js';

/**
 * RTSP → MJPEG proxy for gate / weighbridge cameras.
 *
 * Browsers cannot consume RTSP directly. We spawn a per-request ffmpeg
 * process that pulls the RTSP stream over TCP (more reliable on noisy
 * LANs than UDP) and re-encodes it as motion-JPEG, which any modern
 * browser can render in an `<img>` tag or sample into a `<canvas>`.
 *
 * Endpoints:
 *   GET /api/v1/cameras/:id/stream.mjpg   continuous MJPEG feed
 *   GET /api/v1/cameras/:id/snapshot.jpg  one-shot JPEG frame
 *
 * Security: credentials live in env vars and never reach the client.
 * The proxy only resolves whitelisted camera ids to RTSP URLs.
 */

const ffmpegPath = (ffmpegStatic as unknown as string) || 'ffmpeg';

const cameras: Record<string, { url: string | undefined; label: string }> = {
  front: { url: config.CAMERA_FRONT_RTSP_URL, label: 'Front Camera' },
  top: { url: config.CAMERA_TOP_RTSP_URL, label: 'Top Camera' },
};

function resolveCamera(id: string): { url: string; label: string } | null {
  const cam = cameras[id];
  if (!cam || !cam.url) return null;
  return { url: cam.url, label: cam.label };
}

const MJPEG_BOUNDARY = 'ffmpegmjpegboundary';

function streamMjpeg(req: Request, res: Response, rtspUrl: string): void {
  res.writeHead(200, {
    'Content-Type': `multipart/x-mixed-replace; boundary=${MJPEG_BOUNDARY}`,
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Connection: 'close',
  });

  const args = [
    '-rtsp_transport', 'tcp',
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-i', rtspUrl,
    '-f', 'mjpeg',
    '-q:v', '5',
    '-r', String(config.CAMERA_STREAM_FPS),
    '-vf', `scale=${config.CAMERA_STREAM_WIDTH}:-2`,
    '-an',
    'pipe:1',
  ];

  const ff = spawn(ffmpegPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // SOI / EOI framing — split ffmpeg's MJPEG byte stream into discrete
  // JPEG frames and wrap each one in a multipart part.
  let buf = Buffer.alloc(0);
  ff.stdout.on('data', (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    while (true) {
      const start = buf.indexOf(Buffer.from([0xff, 0xd8]));
      if (start < 0) break;
      const end = buf.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
      if (end < 0) break;
      const frame = buf.slice(start, end + 2);
      buf = buf.slice(end + 2);
      const header =
        `--${MJPEG_BOUNDARY}\r\n` +
        `Content-Type: image/jpeg\r\n` +
        `Content-Length: ${frame.length}\r\n\r\n`;
      if (!res.writableEnded) {
        res.write(header);
        res.write(frame);
        res.write('\r\n');
      }
    }
  });

  ff.stderr.on('data', (d: Buffer) => {
    // ffmpeg is chatty on stderr even on success; only log at debug.
    logger.debug({ msg: 'ffmpeg', out: d.toString() });
  });

  const cleanup = () => {
    if (!ff.killed) ff.kill('SIGKILL');
    if (!res.writableEnded) res.end();
  };

  ff.on('error', (err) => {
    logger.error({ err }, 'ffmpeg spawn failed');
    cleanup();
  });
  ff.on('exit', cleanup);
  req.on('close', cleanup);
  req.on('aborted', cleanup);
}

function captureSnapshot(rtspUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-frames:v', '1',
      '-q:v', '3',
      '-vf', `scale=${config.CAMERA_STREAM_WIDTH}:-2`,
      '-f', 'image2',
      '-vcodec', 'mjpeg',
      'pipe:1',
    ];
    const ff = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    let stderr = '';
    const killTimer = setTimeout(() => ff.kill('SIGKILL'), 10_000);

    ff.stdout.on('data', (c: Buffer) => chunks.push(c));
    ff.stderr.on('data', (c: Buffer) => {
      stderr += c.toString();
    });
    ff.on('error', (err) => {
      clearTimeout(killTimer);
      reject(err);
    });
    ff.on('close', (code) => {
      clearTimeout(killTimer);
      if (code === 0 && chunks.length > 0) return resolve(Buffer.concat(chunks));
      reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}

export const camerasRouter = Router();

camerasRouter.get('/', (_req, res) => {
  res.json({
    cameras: Object.entries(cameras).map(([id, cam]) => ({
      id,
      label: cam.label,
      configured: Boolean(cam.url),
    })),
  });
});

camerasRouter.get('/:id/stream.mjpg', (req, res) => {
  const cam = resolveCamera(req.params.id);
  if (!cam) {
    res.status(404).json({ error: 'Camera not configured' });
    return;
  }
  streamMjpeg(req, res, cam.url);
});

camerasRouter.get('/:id/snapshot.jpg', async (req, res) => {
  const cam = resolveCamera(req.params.id);
  if (!cam) {
    res.status(404).json({ error: 'Camera not configured' });
    return;
  }
  try {
    const jpg = await captureSnapshot(cam.url);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(jpg);
  } catch (err) {
    logger.error({ err, cameraId: req.params.id }, 'snapshot failed');
    res.status(502).json({ error: 'Camera unreachable' });
  }
});

/**
 * Capture a frame and persist it to the uploads directory. The DB only
 * stores the returned `url` (≈ 80 bytes) instead of a multi-KB base64
 * payload, which keeps the JSON request body well under the 10 KB cap.
 */
camerasRouter.post('/:id/capture', async (req, res) => {
  const cam = resolveCamera(req.params.id);
  if (!cam) {
    res.status(404).json({ error: 'Camera not configured' });
    return;
  }
  try {
    const jpg = await captureSnapshot(cam.url);
    const stored = await persistSnapshot(req.params.id, jpg);
    res.status(201).json(stored);
  } catch (err) {
    logger.error({ err, cameraId: req.params.id }, 'capture failed');
    res.status(502).json({ error: 'Camera unreachable' });
  }
});

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const SNAPSHOT_DIR = 'snapshots';

async function persistSnapshot(
  cameraId: string,
  data: Buffer,
): Promise<{ url: string; path: string; filename: string; size: number }> {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const safeId = cameraId.replace(/[^a-z0-9_-]/gi, '');
  const filename = `${safeId}-${now.getTime()}-${randomUUID().slice(0, 8)}.jpg`;
  const relDir = path.join(SNAPSHOT_DIR, yyyy, mm, dd);
  const absDir = path.join(UPLOAD_ROOT, relDir);
  await mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, filename);
  await writeFile(absPath, data);
  // Public, server-relative URL (served by express.static at /uploads).
  const url = `/uploads/${relDir.split(path.sep).join('/')}/${filename}`;
  return { url, path: absPath, filename, size: data.length };
}
