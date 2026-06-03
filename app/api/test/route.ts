export function POST(request: Request) {
    const headers = Object.fromEntries(request.headers.entries());
    
    return Response.json({
      headers,
      contentLength: headers['content-length'],
      timestamp: new Date().toISOString(),
    });
  }