import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleGroqChat } from './server/groqChat.js'

// Serves /api/groq during `npm run dev` with the same handler Vercel uses.
function groqDevApi() {
  return {
    name: 'groq-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/api/groq') return next()

        const env = loadEnv(server.config.mode, process.cwd(), '')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const raw = Buffer.concat(chunks).toString('utf8')

        let body = {}
        if (raw) {
          try {
            body = JSON.parse(raw)
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'invalid_json',
              message: 'Request body must be JSON.',
            }))
            return
          }
        }

        try {
          const result = await handleGroqChat({ method: req.method, body, env })
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.json))
        } catch (error) {
          console.error('Dev Groq API error:', error?.message || error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: 'internal_error',
            message: 'The analysis service hit an unexpected error. Please try again.',
          }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), groqDevApi()],
})
