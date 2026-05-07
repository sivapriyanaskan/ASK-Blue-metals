# Performance Implementation Guide
## React + Node.js Full-Stack Project

> **Scope:** This document defines performance standards, measurement strategies, and implementation techniques for both the React frontend and Node.js backend. Every section maps to measurable metrics. Treat this as the engineering contract for performance — not a suggestion list.

---

## Table of Contents

1. [Performance Budgets & Targets](#1-performance-budgets--targets)
2. [Core Web Vitals](#2-core-web-vitals)
3. [Frontend — Build & Bundle Optimization](#3-frontend--build--bundle-optimization)
4. [Frontend — React Runtime Performance](#4-frontend--react-runtime-performance)
5. [Frontend — Asset Optimization](#5-frontend--asset-optimization)
6. [Frontend — Network & Caching](#6-frontend--network--caching)
7. [Backend — Node.js API Performance](#7-backend--nodejs-api-performance)
8. [Backend — Database Optimization](#8-backend--database-optimization)
9. [Backend — Caching Strategy](#9-backend--caching-strategy)
10. [Backend — Concurrency & Scalability](#10-backend--concurrency--scalability)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Performance Testing](#12-performance-testing)
13. [CI/CD Performance Gates](#13-cicd-performance-gates)
14. [Quick Reference Checklist](#14-quick-reference-checklist)

---

## 1. Performance Budgets & Targets

Define hard limits before writing code. These are enforced in CI — builds that exceed budgets **fail**.

### 1.1 Frontend Budgets

| Metric | Target | Hard Limit |
|---|---|---|
| Initial JS bundle (gzipped) | < 150 KB | 250 KB |
| Total page weight (initial load) | < 500 KB | 1 MB |
| Time to First Byte (TTFB) | < 200 ms | 600 ms |
| First Contentful Paint (FCP) | < 1.8 s | 3 s |
| Largest Contentful Paint (LCP) | < 2.5 s | 4 s |
| Cumulative Layout Shift (CLS) | < 0.1 | 0.25 |
| Interaction to Next Paint (INP) | < 200 ms | 500 ms |
| Total Blocking Time (TBT) | < 200 ms | 600 ms |
| Lighthouse Performance Score | ≥ 85 | 70 |

### 1.2 Backend Budgets

| Metric | Target | Hard Limit |
|---|---|---|
| API response time (p50) | < 100 ms | 200 ms |
| API response time (p95) | < 300 ms | 500 ms |
| API response time (p99) | < 800 ms | 2000 ms |
| Error rate | < 0.1% | 1% |
| Database query time (p95) | < 50 ms | 100 ms |
| Memory usage per process | < 256 MB | 512 MB |
| CPU usage (steady state) | < 40% | 70% |

---

## 2. Core Web Vitals

### 2.1 Largest Contentful Paint (LCP) — Target: < 2.5s

LCP measures when the largest visible content element finishes rendering. The most common culprits are hero images and large text blocks.

**Techniques:**

```html
<!-- Preload the LCP image — put in <head> of index.html -->
<link rel="preload" as="image" href="/hero-image.webp" fetchpriority="high" />
```

```tsx
// Mark the LCP image with high priority (Next.js / React patterns)
<img
  src="/hero-image.webp"
  alt="Hero banner"
  fetchPriority="high"   // signals browser to load immediately
  decoding="sync"        // don't defer decode
  width={1280}
  height={720}
/>
```

```css
/* Ensure LCP element has no render-blocking CSS */
.hero {
  /* Avoid background-image for LCP — use <img> instead for priority loading */
  background: #f0f0f0; /* placeholder color while image loads */
}
```

**Rules:**
- The LCP element must be visible in the initial viewport — never lazy-load it.
- Use `<img>` tags for the LCP element, not CSS `background-image` (not preloadable).
- Eliminate render-blocking resources in `<head>` — no synchronous scripts before content.

---

### 2.2 Cumulative Layout Shift (CLS) — Target: < 0.1

CLS measures unexpected visual movement. Every layout shift costs score points.

```tsx
// ✅ Reserve space for images — prevents layout shift
<img
  src="/product.webp"
  alt="Product"
  width={400}
  height={300}   // explicit dimensions reserve space before load
  style={{ aspectRatio: '4/3' }}
/>

// ✅ Reserve space for async-loaded content
<div style={{ minHeight: '200px' }}>   {/* skeleton placeholder height */}
  {isLoading ? <Skeleton height={200} /> : <UserCard user={user} />}
</div>

// ✅ Reserve space for ads or embeds
<div style={{ width: '300px', height: '250px' }}>
  <AdComponent />
</div>
```

```css
/* ✅ Aspect ratio box — reserves space before content loads */
.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #f0f0f0;
}

/* ❌ Never insert content above existing content dynamically */
/* ❌ Avoid animating top/left/width/height — use transform instead */
.animated {
  /* ❌ */ top: 0; transition: top 0.3s;
  /* ✅ */ transform: translateY(0); transition: transform 0.3s;
}
```

**Rules:**
- Always set `width` and `height` on images and videos.
- Use `aspect-ratio` CSS to reserve space for embeds and dynamic content.
- Never inject content above the fold dynamically after page load.
- Use `transform` and `opacity` for animations — not layout properties.

---

### 2.3 Interaction to Next Paint (INP) — Target: < 200ms

INP measures responsiveness to all user interactions throughout the page lifecycle.

```tsx
// ✅ Defer non-critical work off the main thread
function handleClick() {
  // Immediate feedback — update UI state first
  setLoading(true);

  // Defer heavy computation
  setTimeout(() => {
    processHeavyTask();
    setLoading(false);
  }, 0);
}

// ✅ Use startTransition for non-urgent state updates
import { startTransition } from 'react';

function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    setQuery(e.target.value);  // urgent — update input immediately

    startTransition(() => {
      setResults(filterResults(e.target.value)); // non-urgent — can be interrupted
    });
  }

  return <input value={query} onChange={handleChange} />;
}
```

```tsx
// ✅ Web Worker for CPU-intensive tasks
const worker = new Worker(new URL('./heavyComputation.worker.ts', import.meta.url));

function processData(data) {
  return new Promise((resolve) => {
    worker.postMessage(data);
    worker.onmessage = (e) => resolve(e.data);
  });
}
```

---

## 3. Frontend — Build & Bundle Optimization

### 3.1 Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: false, filename: 'dist/bundle-stats.html' }),
  ],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Manual chunk splitting — control what goes in each bundle
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':  ['@tanstack/react-query'],
          'vendor-forms':  ['react-hook-form', 'zod', '@hookform/resolvers'],
          'vendor-ui':     ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
        // Content-hashed filenames for long-term caching
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
      },
    },
    // Warn if any chunk exceeds 500KB
    chunkSizeWarningLimit: 500,
  },
  // Aggressive dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
});
```

### 3.2 Code Splitting

**Rule:** Every page-level component must be lazy-loaded. No exceptions.

```tsx
// src/routes.tsx — all pages are lazy
import { lazy, Suspense } from 'react';

const Dashboard   = lazy(() => import('./pages/Dashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Settings    = lazy(() => import('./pages/Settings'));
const Reports     = lazy(() => import('./pages/Reports'));

// Skeleton-based suspense fallback — no layout shift
function PageSkeleton() {
  return <div className="page-skeleton" aria-busy="true" aria-label="Loading page..." />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Dashboard />
          </Suspense>
        ),
      },
      // ...
    ],
  },
]);
```

**Lazy-load heavy libraries:**

```tsx
// ✅ Load chart library only when chart is rendered
const ChartComponent = lazy(() =>
  import('recharts').then(mod => ({
    default: mod.LineChart,
  }))
);

// ✅ Dynamic import for rarely-used features
async function exportToPDF() {
  const { jsPDF } = await import('jspdf');  // ~300KB — loaded on demand only
  const doc = new jsPDF();
  doc.save('report.pdf');
}
```

### 3.3 Tree Shaking

```ts
// ✅ Named imports — tree-shakeable
import { format, parseISO } from 'date-fns';
import { debounce } from 'lodash-es';

// ❌ Full library imports — prevents tree shaking
import * as dateFns from 'date-fns';
import _ from 'lodash';

// ✅ Barrel file anti-pattern — avoid in shared components
// src/components/index.ts — DON'T re-export everything
// Instead, import directly from source:
import { Button } from '@/components/ui/Button';
```

---

## 4. Frontend — React Runtime Performance

### 4.1 Memoization — When and When Not to Use

**The Rule:** Only memoize when you have a **measured, reproducible performance problem**. Profile first with React DevTools Profiler.

```tsx
// ✅ CORRECT use of React.memo — component receives stable props
// and re-renders frequently due to parent state changes
const UserRow = React.memo(function UserRow({ user, onEdit }) {
  return (
    <tr>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td><button onClick={() => onEdit(user.id)}>Edit</button></td>
    </tr>
  );
});

// ✅ useCallback — stabilize callbacks passed to memoized children
function UserTable({ users }) {
  const handleEdit = useCallback((id) => {
    navigate(`/users/${id}/edit`);
  }, [navigate]);  // stable — navigate doesn't change

  return users.map(user => (
    <UserRow key={user.id} user={user} onEdit={handleEdit} />
  ));
}

// ✅ useMemo — expensive computation with large data
const sortedFilteredUsers = useMemo(() => {
  return users
    .filter(u => u.status === filterStatus)
    .sort((a, b) => a.name.localeCompare(b.name));
}, [users, filterStatus]);

// ❌ WRONG — memoizing simple derivations adds overhead, not benefit
const fullName = useMemo(() => `${first} ${last}`, [first, last]);
const isDisabled = useMemo(() => !isValid || isLoading, [isValid, isLoading]);
```

### 4.2 List Virtualization

For any list rendering **50+ items**, virtualization is mandatory.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualUserList({ users }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,      // estimated row height in px
    overscan: 5,                 // render 5 extra items outside viewport
  });

  return (
    <div
      ref={parentRef}
      style={{ height: '600px', overflow: 'auto' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <UserRow user={users[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4.3 Avoiding Unnecessary Re-renders

```tsx
// ✅ Split context by update frequency
// Don't put frequently-updated values in the same context as static config

// Frequent updates — separate context
const ThemeContext = createContext(null);         // rarely changes
const UserContext = createContext(null);          // changes on login/logout
const NotificationContext = createContext(null); // changes often

// ✅ Derive state instead of syncing it
// ❌ Sync state — creates double renders
const [items, setItems] = useState([]);
const [count, setCount] = useState(0);
useEffect(() => { setCount(items.length); }, [items]);

// ✅ Derive it
const [items, setItems] = useState([]);
const count = items.length;  // derived — no sync needed

// ✅ Batch state updates (React 18 auto-batches, but be explicit in event handlers)
function handleReset() {
  // React 18: these are automatically batched into one re-render
  setLoading(false);
  setError(null);
  setData([]);
}
```

### 4.4 useEffect Best Practices

```tsx
// ✅ Always clean up subscriptions, timers, and listeners
useEffect(() => {
  const subscription = dataStream.subscribe(handleData);
  return () => subscription.unsubscribe();  // cleanup
}, [dataStream]);

// ✅ Abort fetch on cleanup — prevents state updates on unmounted components
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/users', { signal: controller.signal })
    .then(r => r.json())
    .then(setUsers)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort();
}, []);

// ❌ Missing dependency — stale closure bug
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []);  // count is missing — will always log initial value

// ✅ Use React Query instead of useEffect for data fetching
// useEffect for data fetching is an anti-pattern in modern React
const { data: users } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
```

---

## 5. Frontend — Asset Optimization

### 5.1 Image Optimization

```tsx
// ✅ Use WebP/AVIF with fallback
<picture>
  <source srcSet="/hero.avif" type="image/avif" />
  <source srcSet="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="Hero" width={1280} height={720} />
</picture>

// ✅ Responsive images — serve correct size per viewport
<img
  src="/product-800.webp"
  srcSet="
    /product-400.webp 400w,
    /product-800.webp 800w,
    /product-1200.webp 1200w
  "
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt="Product name"
  width={800}
  height={600}
  loading="lazy"     // lazy-load below-fold images
  decoding="async"   // don't block rendering for decode
/>
```

**Image Rules:**
- Convert all raster images to WebP (minimum) or AVIF.
- Never serve images larger than their display size — 2× max for high-DPI.
- Images above the fold: `loading="eager"`, `fetchPriority="high"`.
- Images below the fold: `loading="lazy"`, `decoding="async"`.
- Use an image CDN (Cloudflare Images, Imgix, Cloudinary) in production.

### 5.2 Font Optimization

```html
<!-- Preconnect to font provider — in <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Preload critical font file -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

```css
/* ✅ Self-hosted fonts with font-display: swap */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;     /* show fallback text immediately, swap when loaded */
  font-style: normal;
}

/* ✅ Use size-adjust to reduce layout shift from font swap */
@font-face {
  font-family: 'FallbackInter';
  src: local('Arial');
  size-adjust: 107%;      /* adjust fallback to match target font metrics */
  ascent-override: 90%;
}
```

**Font Rules:**
- Self-host fonts — never load from third-party CDNs in production (privacy + latency).
- Use variable fonts (`woff2` with range) instead of multiple weight files.
- Subset fonts to only include characters used (use `glyphhanger` or `pyftsubset`).
- Load max 2 font families per page.

### 5.3 CSS Optimization

```ts
// vite.config.ts — CSS code splitting enabled by default in Vite
// Each lazy chunk gets its own CSS file — only loads when chunk loads

// ✅ PurgeCSS via Tailwind's content config — removes unused styles
// tailwind.config.ts
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  // Tailwind purges unused classes automatically in production
};
```

**Critical CSS:**
- Inline critical above-the-fold CSS in `<head>` using Vite's `vite-plugin-critical`.
- Defer non-critical stylesheets with `<link rel="preload" as="style">`.

---

## 6. Frontend — Network & Caching

### 6.1 HTTP Caching Headers

Configure your CDN/server to return these headers:

```nginx
# Static assets — content-hashed filenames, cache forever
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# index.html — never cache (always fresh app shell)
location = /index.html {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# API responses — no cache by default
location /api/ {
  add_header Cache-Control "no-store";
}
```

### 6.2 React Query Caching Strategy

```ts
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  5 * 60 * 1000,   // 5 min — don't refetch if data is fresh
      gcTime:     10 * 60 * 1000,  // 10 min — keep unused data in memory
      retry: 1,                    // retry once on failure
      refetchOnWindowFocus: false, // don't refetch on tab switch by default
    },
  },
});

// Per-query overrides — tune to data volatility
const { data: userProfile } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 10 * 60 * 1000,  // profile rarely changes — 10 min
});

const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  staleTime: 30 * 1000,        // notifications change often — 30 sec
  refetchInterval: 60 * 1000, // poll every 60 sec
});
```

### 6.3 Resource Hints

```html
<!-- In <head> of index.html -->

<!-- DNS prefetch for external domains -->
<link rel="dns-prefetch" href="https://api.yourapp.com" />

<!-- Preconnect to critical origins (DNS + TCP + TLS) -->
<link rel="preconnect" href="https://api.yourapp.com" />

<!-- Prefetch next likely navigation -->
<link rel="prefetch" href="/assets/dashboard-[hash].js" />
```

```tsx
// ✅ Prefetch routes on hover — anticipate navigation
function NavLink({ to, children }) {
  const handleMouseEnter = () => {
    // Prefetch the route chunk on hover
    import(`./pages/${to}`).catch(() => {});
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
```

### 6.4 Service Worker (PWA)

For apps requiring offline support or aggressive caching, use **Workbox** via `vite-plugin-pwa`:

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.yourapp\.com\/api\//,
        handler: 'NetworkFirst',        // try network, fallback to cache
        options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 300 } },
      },
      {
        urlPattern: /\.(png|jpg|webp|svg|gif)$/,
        handler: 'CacheFirst',          // serve from cache, refresh in background
        options: { cacheName: 'image-cache', expiration: { maxEntries: 100 } },
      },
    ],
  },
})
```

---

## 7. Backend — Node.js API Performance

### 7.1 Async Patterns — Never Block the Event Loop

```ts
// ✅ Parallel async operations — don't await sequentially when independent
// ❌ Sequential — total time = A + B + C
const user     = await fetchUser(id);
const orders   = await fetchOrders(id);
const settings = await fetchSettings(id);

// ✅ Parallel — total time = max(A, B, C)
const [user, orders, settings] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
  fetchSettings(id),
]);

// ✅ Controlled concurrency for bulk operations
import pLimit from 'p-limit';
const limit = pLimit(5);  // max 5 concurrent operations

const results = await Promise.all(
  userIds.map(id => limit(() => processUser(id)))
);
```

```ts
// ✅ Move CPU-intensive work off the event loop
import { Worker } from 'worker_threads';

function runHeavyTask(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./workers/heavyTask.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// ❌ Never do synchronous CPU work in the main thread
function syncSort(largeArray) {
  return largeArray.sort(compareFn);  // blocks event loop during sort
}
```

### 7.2 Express Optimization

```ts
import express from 'express';
import compression from 'compression';

const app = express();

// ✅ Gzip/Brotli compression for responses > 1KB
app.use(compression({
  level: 6,             // balance between speed and compression ratio
  threshold: 1024,      // only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ✅ Parse only what you need
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ✅ Disable unnecessary headers
app.disable('x-powered-by');

// ✅ Keep-alive connections — reuse TCP connections
const server = app.listen(PORT);
server.keepAliveTimeout = 65000;    // > load balancer timeout
server.headersTimeout   = 66000;
```

### 7.3 Streaming Responses

```ts
// ✅ Stream large datasets — don't buffer entire result sets in memory
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

router.get('/api/reports/export', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');

  const dbStream = db.queryStream('SELECT * FROM large_table ORDER BY id');
  const csvTransform = new Transform({
    objectMode: true,
    transform(row, _, callback) {
      callback(null, Object.values(row).join(',') + '\n');
    },
  });

  await pipeline(dbStream, csvTransform, res);
});
```

### 7.4 Connection Pooling

```ts
// ✅ PostgreSQL connection pool — pg
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                // max connections in pool
  min: 5,                 // keep minimum connections open
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: true },
});

// Ensure connections are always released
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();     // always release — even on error
  }
}
```

---

## 8. Backend — Database Optimization

### 8.1 Query Optimization

```sql
-- ✅ EXPLAIN ANALYZE every slow query before deploying
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name;

-- ✅ Use indexes on columns used in WHERE, JOIN, ORDER BY
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY idx_orders_user_id   ON orders(user_id);

-- For composite queries, order matters in composite indexes
CREATE INDEX CONCURRENTLY idx_orders_user_status
  ON orders(user_id, status)
  WHERE status != 'cancelled';  -- partial index
```

### 8.2 N+1 Query Prevention

```ts
// ❌ N+1 problem — 1 query for users + N queries for their orders
const users = await db.query('SELECT * FROM users');
for (const user of users.rows) {
  user.orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
}

// ✅ JOIN or batch query — 1 round trip
const result = await db.query(`
  SELECT
    u.id, u.name, u.email,
    json_agg(
      json_build_object('id', o.id, 'total', o.total, 'status', o.status)
    ) FILTER (WHERE o.id IS NOT NULL) AS orders
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id
`);

// ✅ With an ORM — use eager loading, not lazy loading
// Prisma example
const users = await prisma.user.findMany({
  include: { orders: true },  // single query with JOIN
});
```

### 8.3 Pagination

```ts
// ✅ Cursor-based pagination — efficient for large tables
// Avoids OFFSET performance degradation at large page numbers
router.get('/api/users', async (req, res) => {
  const { cursor, limit = 20 } = req.query;
  const take = Math.min(Number(limit), 100);

  const users = await prisma.user.findMany({
    take: take + 1,  // fetch one extra to detect next page
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { id: 'asc' },
  });

  const hasNextPage = users.length > take;
  const items = hasNextPage ? users.slice(0, -1) : users;

  res.json({
    items,
    nextCursor: hasNextPage ? items[items.length - 1].id : null,
  });
});

// ❌ OFFSET pagination at scale — gets slower as offset grows
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 100000; -- full scan to offset 100K
```

### 8.4 Read Replicas

```ts
// Route read-heavy queries to read replica
import { primaryPool, replicaPool } from './db';

async function getUser(id) {
  // Write operations — primary only
  return replicaPool.query('SELECT * FROM users WHERE id = $1', [id]);
}

async function updateUser(id, data) {
  // Write operations — primary only
  return primaryPool.query(
    'UPDATE users SET name = $1 WHERE id = $2',
    [data.name, id]
  );
}
```

---

## 9. Backend — Caching Strategy

### 9.1 Redis Caching Patterns

```ts
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

// ✅ Cache-aside pattern (most common)
async function getUserWithCache(id: string) {
  const cacheKey = `user:${id}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss — fetch from DB
  const user = await db.getUserById(id);
  if (!user) return null;

  // 3. Store in cache with TTL
  await redis.setEx(cacheKey, 3600, JSON.stringify(user)); // 1 hour TTL

  return user;
}

// ✅ Invalidate cache on mutation
async function updateUser(id: string, data: Partial<User>) {
  const user = await db.updateUser(id, data);
  await redis.del(`user:${id}`);       // invalidate specific key
  await redis.del(`users:list`);       // invalidate list cache
  return user;
}
```

### 9.2 Cache TTL Strategy

| Data Type | TTL | Invalidation |
|---|---|---|
| User profile | 1 hour | On profile update |
| Product catalogue | 10 minutes | On product update |
| Dashboard aggregates | 5 minutes | Time-based expiry |
| Session data | 24 hours | On logout |
| Rate limit counters | 15 minutes | Time-based expiry |
| Real-time data | 30 seconds | Time-based expiry |

### 9.3 HTTP Response Caching

```ts
// ✅ Set cache headers on cacheable API responses
router.get('/api/products', async (req, res) => {
  const products = await getCachedProducts();

  res.set({
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    'ETag': generateETag(products),
    'Last-Modified': new Date(products.updatedAt).toUTCString(),
  });

  // Conditional request — return 304 if not modified
  if (req.headers['if-none-match'] === res.get('ETag')) {
    return res.status(304).end();
  }

  res.json(products);
});
```

---

## 10. Backend — Concurrency & Scalability

### 10.1 Cluster Mode

```ts
// server.ts — utilize all CPU cores
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid} starting ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code) => {
    console.error(`Worker ${worker.process.pid} died (${code}). Restarting.`);
    cluster.fork();  // auto-restart dead workers
  });
} else {
  // Worker process — run the Express app
  startApp();
}
```

### 10.2 Rate Limiting

```ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// ✅ Redis-backed rate limiting — works across cluster/multiple instances
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
  }),
  keyGenerator: (req) => req.user?.id || req.ip,  // per-user or per-IP
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});
```

### 10.3 Graceful Shutdown

```ts
// Handle graceful shutdown — drain in-flight requests before exiting
const server = app.listen(PORT);

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received. Starting graceful shutdown.`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed.');

    // Close database pool
    await pool.end();
    console.log('Database pool closed.');

    // Close Redis connection
    await redis.quit();
    console.log('Redis connection closed.');

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
```

---

## 11. Monitoring & Observability

### 11.1 Frontend — Web Vitals Tracking

```tsx
// src/lib/analytics.ts — report Core Web Vitals to your backend
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name:   metric.name,
    value:  metric.value,
    rating: metric.rating,   // 'good' | 'needs-improvement' | 'poor'
    delta:  metric.delta,
    id:     metric.id,
    page:   window.location.pathname,
  });

  navigator.sendBeacon('/api/metrics/web-vitals', body);
}

onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### 11.2 Backend — Prometheus Metrics

```ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

// HTTP request metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Middleware to record metrics
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = {
      method:      req.method,
      route:       req.route?.path || 'unknown',
      status_code: res.statusCode,
    };
    end(labels);
    httpRequestTotal.inc(labels);
  });

  next();
});

// Expose metrics endpoint for Prometheus scraping
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 11.3 Structured Logging with Performance Context

```ts
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Log slow queries
async function timedQuery(name, queryFn) {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    if (duration > 100) {  // warn on queries > 100ms
      logger.warn('Slow query detected', { query: name, duration_ms: duration });
    }

    return result;
  } catch (error) {
    logger.error('Query failed', { query: name, error: error.message });
    throw error;
  }
}
```

---

## 12. Performance Testing

### 12.1 Load Testing with k6

```js
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate    = new Rate('errors');
const apiDuration  = new Trend('api_duration');

export const options = {
  stages: [
    { duration: '1m',  target: 50  },  // ramp up to 50 users
    { duration: '5m',  target: 50  },  // sustain 50 users
    { duration: '2m',  target: 200 },  // ramp up to 200 users
    { duration: '5m',  target: 200 },  // sustain peak load
    { duration: '1m',  target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration:    ['p(95)<500'],   // 95% of requests under 500ms
    http_req_failed:      ['rate<0.01'],   // error rate < 1%
    'api_duration':       ['p(99)<800'],   // 99th percentile under 800ms
  },
};

export default function () {
  const res = http.get('https://api.yourapp.com/api/users', {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(res, {
    'status is 200':    (r) => r.status === 200,
    'response < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(res.status !== 200);
  apiDuration.add(res.timings.duration);

  sleep(1);
}
```

### 12.2 Frontend Performance Testing with Playwright

```ts
// tests/performance/lcp.spec.ts
import { test, expect } from '@playwright/test';

test('LCP is under 2.5 seconds on dashboard', async ({ page }) => {
  await page.goto('/dashboard');

  const lcpValue = await page.evaluate(() =>
    new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve(entries[entries.length - 1].startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    })
  );

  expect(lcpValue).toBeLessThan(2500);
});

test('no layout shifts above 0.1 on product page', async ({ page }) => {
  await page.goto('/products/123');

  const cls = await page.evaluate(() =>
    new Promise((resolve) => {
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
        resolve(clsValue);
      }).observe({ entryTypes: ['layout-shift'] });
      setTimeout(() => resolve(clsValue), 3000);
    })
  );

  expect(cls).toBeLessThan(0.1);
});
```

---

## 13. CI/CD Performance Gates

Every pull request must pass these checks before merging:

```yaml
# .github/workflows/performance.yml
name: Performance Checks

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - name: Check bundle size
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Fails PR if bundle exceeds limits in .size-limit.json

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: '.lighthouserc.json'
          uploadArtifacts: true
          temporaryPublicStorage: true

  load-test:
    runs-on: ubuntu-latest
    if: github.base_ref == 'main'  # Only on PRs to main
    steps:
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/performance/load-test.js
        env:
          TEST_TOKEN: ${{ secrets.LOAD_TEST_TOKEN }}
```

```json
// .size-limit.json
[
  {
    "name": "Initial JS bundle",
    "path": "dist/assets/index-*.js",
    "limit": "250 KB",
    "gzip": true
  },
  {
    "name": "Vendor React bundle",
    "path": "dist/assets/vendor-react-*.js",
    "limit": "150 KB",
    "gzip": true
  }
]
```

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance":    ["error", { "minScore": 0.85 }],
        "categories:accessibility":  ["error", { "minScore": 0.90 }],
        "first-contentful-paint":    ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint":  ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift":   ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time":       ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

---

## 14. Quick Reference Checklist

### Frontend — Before Every Release

**Build & Bundle**
- [ ] Bundle size within budget (initial JS < 250 KB gzipped)
- [ ] All page components lazy-loaded with `React.lazy`
- [ ] Heavy libraries dynamically imported
- [ ] Tree shaking verified — no full library imports
- [ ] Bundle visualizer reviewed for unexpected large chunks

**Images & Assets**
- [ ] All images converted to WebP/AVIF
- [ ] LCP image has `fetchPriority="high"` — not lazy-loaded
- [ ] Below-fold images have `loading="lazy"`
- [ ] All images have explicit `width` and `height`
- [ ] Fonts self-hosted, subsetted, and use `font-display: swap`

**React Performance**
- [ ] No unnecessary `React.memo` / `useMemo` / `useCallback` without profiling
- [ ] Lists > 50 items use virtualization
- [ ] `startTransition` used for non-urgent state updates
- [ ] No floating Promises / unhandled async errors
- [ ] `prefers-reduced-motion` respected

**Caching & Network**
- [ ] Static assets have `Cache-Control: immutable`
- [ ] React Query `staleTime` tuned per query
- [ ] Resource hints (`preconnect`, `preload`) in `<head>`

### Backend — Before Every Release

**API**
- [ ] p95 response time < 300ms verified under load
- [ ] No synchronous CPU work on event loop
- [ ] Independent async operations use `Promise.all`
- [ ] Compression middleware enabled
- [ ] Connection pooling configured with appropriate limits

**Database**
- [ ] All new queries have `EXPLAIN ANALYZE` reviewed
- [ ] Indexes added for WHERE/JOIN/ORDER BY columns
- [ ] No N+1 query patterns
- [ ] Cursor-based pagination used for large datasets

**Caching**
- [ ] Redis caching for expensive/repeated queries
- [ ] Cache invalidation logic tested
- [ ] TTLs set appropriately per data type

**CI Gates**
- [ ] Lighthouse score ≥ 85 passing
- [ ] Bundle size limits passing
- [ ] Load test p95 < 500ms passing

---

## References

- [Web Vitals — Google](https://web.dev/vitals/)
- [PRPL Pattern — web.dev](https://web.dev/apply-instant-loading-with-prpl/)
- [React Performance — React Docs](https://react.dev/learn/render-and-commit)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/dont-block-the-event-loop)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [TanStack Query Caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- [k6 Load Testing](https://k6.io/docs/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

*Document version: 1.0 — Review performance budgets at the start of each major release cycle. Tighten targets as the product matures.*
