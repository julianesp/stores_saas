import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/api/webhooks(.*)',
  '/api/public(.*)',
  // Ruta interna del cron de respaldo a Drive: la llama el Worker con
  // X-Cron-Secret (no hay sesión de Clerk). Se protege a sí misma con
  // CRON_SECRET. Solo /run — los de OAuth (connect/callback) sí usan sesión.
  '/api/backup/run',
  '/store(.*)',
  '/tienda(.*)',
  '/terminos(.*)',
  '/privacidad(.*)',
  '/acerca(.*)',
  '/contacto(.*)',
  '/funcionalidades(.*)',
  '/como-empezar(.*)',
  '/payment-confirmation(.*)',
  '/api/payments(.*)',
  '/manifest.webmanifest',
  '/robots.txt',
  '/favicon.ico',
  '/sw.js',
  '/workbox-(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect({ unauthenticatedUrl: new URL('/sign-in', request.url).toString() })
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
