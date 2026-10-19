import http from 'node:http';

/**
 * Creates and returns the fixture HTTP server.
 */
export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method;

    // Helper to send JSON responses
    const json = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(data));
    };

    // 1. Health check & readiness probe
    if (method === 'GET' && pathname === '/health') {
      return json(200, {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Authentication endpoint: POST /api/login
    if (method === 'POST' && pathname === '/api/login') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      try {
        const payload = JSON.parse(body || '{}');
        if (payload.username === 'admin' && payload.password === 'secret123') {
          return json(200, {
            token: 'jwt-fixture-token-valid-2026',
            user: {
              id: 'user-001',
              username: 'admin',
              role: 'owner',
            },
          });
        }
        return json(401, { error: 'Invalid credentials' });
      } catch (err) {
        return json(400, { error: 'Malformed JSON payload' });
      }
    }

    // 3. Authenticated endpoint: GET /api/dashboard
    if (method === 'GET' && pathname === '/api/dashboard') {
      const authHeader = req.headers['authorization'] || '';
      if (!authHeader.startsWith('Bearer jwt-fixture-token-valid-2026')) {
        return json(401, { error: 'Unauthorized: missing or invalid token' });
      }

      // Check simulated regression trigger (for maintenance & regression test flows)
      if (process.env.SIMULATE_REGRESSION === 'true' || url.searchParams.get('fail') === '1') {
        return json(500, {
          error: 'Internal Server Error: Database pool exhausted in dashboard query',
          code: 'ERR_POOL_EXHAUSTED',
        });
      }

      return json(200, {
        metrics: {
          activeUsers: 42,
          mrr: 12000,
          churnRate: '1.2%',
        },
        services: ['billing', 'auth', 'analytics'],
        status: 'healthy',
      });
    }

    // 4. Default 404
    return json(404, { error: `Not Found: ${method} ${pathname}` });
  });
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;
  const server = createServer();
  server.listen(port, () => {
    const addr = server.address();
    console.log(`Sample SaaS fixture server listening on port ${addr.port}`);
  });
}
