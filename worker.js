/*
CORS Proxy Worker - Improved Version
Handles cross-origin requests with browser-like headers to bypass CDN restrictions
*/

// Configuration
const WHITELIST_ORIGINS = [".*"]; // Allow all origins
const BLACKLIST_URLS = []; // Block nothing by default

// Check if URL/origin matches patterns
function isListed(uri, patterns) {
    if (typeof uri !== "string") return true;
    return patterns.some(pattern => new RegExp(pattern).test(uri));
}

// Add browser-like headers to bypass CDN detection
function addBrowserHeaders(headers, targetUrl) {
    const url = new URL(targetUrl);
    
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    headers.set("Accept", "*/*");
    headers.set("Accept-Language", "en-US,en;q=0.9");
    headers.set("Accept-Encoding", "gzip, deflate, br");
    headers.set("Referer", "https://hianime.to/");
    headers.set("Origin", "https://hianime.to");
    headers.set("Sec-Fetch-Dest", "empty");
    headers.set("Sec-Fetch-Mode", "cors");
    headers.set("Sec-Fetch-Site", "cross-site");
    headers.set("Sec-Ch-Ua", '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"');
    headers.set("Sec-Ch-Ua-Mobile", "?0");
    headers.set("Sec-Ch-Ua-Platform", '"Windows"');
    
    return headers;
}

// Setup CORS headers for response
function setupCORSHeaders(headers, origin) {
    headers.set("Access-Control-Allow-Origin", origin || "*");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    headers.set("Access-Control-Max-Age", "86400");
    return headers;
}

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";
    const isOptions = request.method === "OPTIONS";
    
    // Handle OPTIONS preflight
    if (isOptions) {
        const headers = new Headers();
        setupCORSHeaders(headers, origin);
        return new Response(null, { status: 204, headers });
    }
    
    // Get target URL from query parameter or path
    let targetUrl = url.searchParams.get("url") || url.search.substring(1);
    
    // Decode URL (support double encoding)
    if (targetUrl) {
        targetUrl = decodeURIComponent(decodeURIComponent(targetUrl));
    }
    
    // Add https:// if missing
    if (targetUrl && !targetUrl.match(/^https?:\/\//)) {
        targetUrl = "https://" + targetUrl;
    }
    
    // Show usage info if no target URL
    if (!targetUrl) {
        const headers = new Headers({ "Content-Type": "text/plain" });
        setupCORSHeaders(headers, origin);
        
        return new Response(
            `CORS Proxy Worker\n\n` +
            `Usage:\n` +
            `  ${url.origin}/?url=https://example.com/api\n` +
            `  ${url.origin}/?https://example.com/api\n\n` +
            `With custom headers:\n` +
            `  headers: { "x-cors-headers": JSON.stringify({ "Authorization": "Bearer token" }) }\n\n` +
            `Current IP: ${request.headers.get("CF-Connecting-IP")}\n`,
            { status: 200, headers }
        );
    }
    
    // Check whitelist/blacklist
    const originHeader = request.headers.get("Origin");
    if (!isListed(originHeader, WHITELIST_ORIGINS) || isListed(targetUrl, BLACKLIST_URLS)) {
        return new Response("Access denied", { status: 403 });
    }
    
    try {
        // Parse custom headers from x-cors-headers
        let customHeaders = {};
        const corsHeadersStr = request.headers.get("x-cors-headers");
        if (corsHeadersStr) {
            try {
                customHeaders = JSON.parse(corsHeadersStr);
            } catch (e) {
                console.error("Failed to parse x-cors-headers:", e);
            }
        }
        
        // Build request headers
        const proxyHeaders = new Headers();
        
        // Add browser-like headers first
        addBrowserHeaders(proxyHeaders, targetUrl);
        
        // Copy allowed headers from original request
        const allowedHeaders = ["range", "if-range", "if-none-match", "if-modified-since", "cache-control"];
        for (const [key, value] of request.headers.entries()) {
            const keyLower = key.toLowerCase();
            if (allowedHeaders.includes(keyLower)) {
                proxyHeaders.set(key, value);
            }
        }
        
        // Apply custom headers (these override browser headers)
        Object.entries(customHeaders).forEach(([key, value]) => {
            proxyHeaders.set(key, value);
        });
        
        // Create proxied request
        const proxyRequest = new Request(targetUrl, {
            method: request.method,
            headers: proxyHeaders,
            body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
            redirect: "follow"
        });
        
        // Fetch from target
        const response = await fetch(proxyRequest);
        
        // Build response headers
        const responseHeaders = new Headers(response.headers);
        setupCORSHeaders(responseHeaders, origin);
        
        // Expose all headers
        const exposedHeaders = [];
        const allHeaders = {};
        for (const [key, value] of response.headers.entries()) {
            exposedHeaders.push(key);
            allHeaders[key] = value;
        }
        
        responseHeaders.set("Access-Control-Expose-Headers", exposedHeaders.join(","));
        responseHeaders.set("cors-received-headers", JSON.stringify(allHeaders));
        
        // Return proxied response
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
        
    } catch (error) {
        console.error("Proxy error:", error);
        const headers = new Headers({ "Content-Type": "text/plain" });
        setupCORSHeaders(headers, origin);
        
        return new Response(
            `Error proxying request: ${error.message}`,
            { status: 502, headers }
        );
    }
}
