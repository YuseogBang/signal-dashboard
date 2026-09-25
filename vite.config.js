import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'

function localApiMiddleware() {
  return {
    name: 'local-api-middleware',
    configureServer(server) {
      const routes = {
        '/api/kis-candles': './api/kis-candles.js',
        '/api/kis-positioning': './api/kis-positioning.js',
      }
      Object.entries(routes).forEach(([route, modulePath]) => {
        server.middlewares.use(route, async (req, res) => {
          const url = new URL(req.url || '/', 'http://localhost')
          const query = Object.fromEntries(url.searchParams.entries())
          const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this },
            json(payload) {
              res.statusCode = this.statusCode
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(payload))
            },
          }
          const { default: handler } = await import(resolve(process.cwd(), modulePath))
          await handler({ method: req.method, query }, response)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.KIS_APP_KEY ||= env.KIS_APP_KEY
  process.env.KIS_APP_SECRET ||= env.KIS_APP_SECRET
  process.env.KIS_ACCOUNT_NO ||= env.KIS_ACCOUNT_NO
  process.env.KIS_ACCOUNT_PRODUCT ||= env.KIS_ACCOUNT_PRODUCT
  process.env.KIS_ENV ||= env.KIS_ENV

  return {
    plugins: [react(), localApiMiddleware()],
  }
})
