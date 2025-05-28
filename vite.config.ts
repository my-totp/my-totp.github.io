import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'

  // Check if SSL certificates exist (only in dev mode)
  const certPath = './certs/localhost.pem'
  const keyPath = './certs/localhost-key.pem'
  const hasSSLCerts = isDev && fs.existsSync(certPath) && fs.existsSync(keyPath)

  return {
    base: '/',
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        },
        manifest: {
          name: 'TOTP Authenticator',
          short_name: 'TOTP',
          description: 'Offline TOTP Authenticator',
          theme_color: '#4f46e5',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'vite.svg',
              sizes: 'any',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    server: {
      ...(hasSSLCerts && {
        https: {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      }),
      host: true // Allow external connections
    }
  }
})