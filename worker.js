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
  
  // Get target URL from query parameter
  let apiUrl = url.searchParams.get('url')
  
  // Fallback: check if URL is directly after ?
  if (!apiUrl) {
    apiUrl = url.search.substr(1)
  }
  
  if (!apiUrl) {
    return new Response('Usage: https://your-worker.workers.dev/?url=https://example.com/api', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
  
  // Add https:// if missing
  if (!apiUrl.match(/^https?:\/\//)) {
    apiUrl = 'https://' + apiUrl
  }

  console.log('Proxying request to:', apiUrl)
  
  // Parse custom headers if provided
  let customHeaders = {}
  const corsHeaders = request.headers.get('x-cors-headers')
  if (corsHeaders) {
    try {
      customHeaders = JSON.parse(corsHeaders)
    } catch (e) {
      console.error('Failed to parse x-cors-headers:', e)
    }
  }

  // Create new request with original headers + custom headers
  const modifiedHeaders = new Headers(request.headers)
  Object.keys(customHeaders).forEach(key => {
    modifiedHeaders.set(key, customHeaders[key])
  })

  const modifiedRequest = new Request(apiUrl, {
    method: request.method,
    headers: modifiedHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
  })
  
  try {
    const response = await fetch(modifiedRequest)
    
    // Clone response and add CORS headers
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
    
    // Store received headers for debugging
    const receivedHeaders = {}
    response.headers.forEach((value, key) => {
      receivedHeaders[key] = value
    })
    modifiedResponse.headers.set('cors-received-headers', JSON.stringify(receivedHeaders))
    
    return modifiedResponse
  } catch (error) {
    console.error('Fetch error:', error)
    return new Response('Error fetching URL: ' + error.message, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
