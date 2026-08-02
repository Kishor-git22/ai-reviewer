import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Review',
    short_name: 'AI Review',
    description:
      'AI Review runs every pull request past a panel of AI models that debate the change and only surface findings the panel agrees on.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#110f0e',
    theme_color: '#110f0e',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
