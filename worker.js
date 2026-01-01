addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  const url = new URL(request.url)
  
  // Get target URL
  let apiUrl = url.searchParams.get('url')
  if (!apiUrl) {
    apiUrl = url.search.substr(1)
  }
  
  if (!apiUrl) {
    return new Response('Usage: ?url=https://example.com', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }
  
  // Add https:// if missing
  if (!apiUrl.match(/^https?:\/\//)) {
    apiUrl = 'https://' + apiUrl
  }

  console.log('Proxying to:', apiUrl)
  
  // Create browser-like headers to bypass detection
  const headers = new Headers()
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
  headers.set('Accept', '*/*')
  headers.set('Accept-Language', 'en-US,en;q=0.9')
  headers.set('Accept-Encoding', 'gzip, deflate, br')
  headers.set('Origin', 'https://hianime.to')
  headers.set('Referer', 'https://hianime.to/')
  headers.set('Sec-Fetch-Dest', 'empty')
  headers.set('Sec-Fetch-Mode', 'cors')
  headers.set('Sec-Fetch-Site', 'cross-site')
  
  // Copy important headers from original request
  const copiedHeaders = ['Range', 'If-Range', 'If-None-Match', 'If-Modified-Since']
  copiedHeaders.forEach(header => {
    const value = request.headers.get(header)
    if (value) headers.set(header, value)
  })

  const modifiedRequest = new Request(apiUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'follow'
  })
  
  try {
    const response = await fetch(modifiedRequest)
    
    // Create new response with CORS headers
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
    
    // Add CORS headers
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    modifiedResponse.headers.set('Access-Control-Allow-Headers', '*')
    modifiedResponse.headers.set('Access-Control-Expose-Headers', '*')
    
    // Store received headers
    const receivedHeaders = {}
    response.headers.forEach((value, key) => {
      receivedHeaders[key] = value
    })
    modifiedResponse.headers.set('cors-received-headers', JSON.stringify(receivedHeaders))
    
    return modifiedResponse
  } catch (error) {
    console.error('Fetch error:', error)
    return new Response(`Error: ${error.message}`, {
      status: 502,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
