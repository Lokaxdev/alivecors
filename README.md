# CORS Proxy Worker

A Cloudflare Workers-based CORS proxy for bypassing CORS restrictions.

## Features
- ✅ Bypass CORS restrictions
- ✅ Support for all HTTP methods
- ✅ Custom header support
- ✅ Works with M3U8/HLS streams
- ✅ Free (100k requests/day)

## Deployment

### Via GitHub Integration (No CLI)
1. Fork this repository
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
3. Click **Workers & Pages** → **Create Application**
4. Click **Pages** tab → **Connect to Git**
5. Select your forked repository
6. Click **Save and Deploy**

### Via Wrangler CLI
```bash
npm install -g wrangler
wrangler login
wrangler publish
```

## Usage

### Basic Usage
```javascript
fetch('https://your-worker.workers.dev/?url=https://api.example.com/data')
  .then(res => res.json())
  .then(data => console.log(data))
```

### With Custom Headers
```javascript
fetch('https://your-worker.workers.dev/?url=https://api.example.com/data', {
  headers: {
    'x-cors-headers': JSON.stringify({
      'Authorization': 'Bearer token123',
      'Custom-Header': 'value'
    })
  }
})
```

### For Video Streams (M3U8)
```javascript
const videoUrl = 'https://example.com/video.m3u8'
const proxiedUrl = `https://your-worker.workers.dev/?url=${videoUrl}`

// Use with HLS.js
hls.loadSource(proxiedUrl)
```

## URL Formats Supported
- `?url=https://example.com/api`
- `?https://example.com/api`
- `?example.com/api` (auto-adds https://)

## Limits (Free Plan)
- 100,000 requests per day
- 10ms CPU time per request
- No bandwidth limits

## License
MIT
```

### **File 4: `.gitignore`**
```
node_modules/
.wrangler/
worker/
dist/
