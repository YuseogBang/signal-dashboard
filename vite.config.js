import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function localApiMiddleware() {
  return {
    name: 'local-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api/toss-candles', async (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost')
        const query = Object.fromEntries(url.searchParams.entries())
        const response = {
          statusCode: 200,
          status(code) {
            this.statusCode = code
            return this
          },
          json(payload) {
            res.statusCode = this.statusCode
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(payload))
          },
        }

        const { default: handler } = await import('./api/toss-candles.js')
        await handler({ method: req.method, query }, response)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiMiddleware()],
})
