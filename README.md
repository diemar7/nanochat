# NanoChat

App de chat familiar privada para que Luciano (Nano) pueda chatear con su familia sin celular ni número propio.

## Stack

- **Next.js 16.2** — App Router + TypeScript + Tailwind
- **Supabase** — PostgreSQL + Realtime + Auth (email/password)
- **Vercel** — deploy automático desde `main`
- **PWA** — instalable en el celu

## Funcionalidades

- Login con email/password
- Chat grupal (familia)
- Chats 1 a 1
- Notificaciones push Web Push nativas (funciona con la PWA instalada)
- Gestión de usuarios (solo admins)

## Arquitectura de notificaciones

1. `public/sw.js` — Service Worker registrado en el cliente
2. `lib/usePushSubscription.ts` — hook que pide permiso y guarda la suscripción
3. `app/api/push/subscribe/route.ts` — API route que persiste la suscripción en Supabase
4. Trigger DB (`trg_notify_push`) via `pg_net` → llama a la Edge Function en cada INSERT en `messages`
5. Edge Function `notify-push` (Supabase) — envía el push con `npm:web-push@3`

**Importante:** usar `npm:web-push` en la Edge Function, NO `esm.sh/web-push` (no funciona en Deno).

## Variables de entorno

**Vercel:**
- `SUPABASE_SERVICE_ROLE_KEY`

**Supabase Edge Function secrets:**
- `VAPID_PRIVATE_KEY`

## Desarrollo local

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

> Las notificaciones push no funcionan en local (requieren HTTPS). Probar siempre en producción.

## Deploy

Push a `main` → Vercel deployea automáticamente.

Para deployar la Edge Function:
```bash
supabase functions deploy notify-push
```
