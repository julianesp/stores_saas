/**
 * Visitas al sitio público (landing, registro, login).
 * - siteVisitsPublic: POST /api/visits — beacon anónimo desde el navegador (sin auth).
 * - siteVisitsAdmin: GET /api/admin/visits — estadísticas, solo superadmin.
 */

import { Hono } from 'hono';
import type { AppEnv, APIResponse } from '../types';
import { parseUserAgent } from '../utils/user-agent';

const ORIGINS_ALLOWED = new Set(['https://posib.dev', 'https://www.posib.dev']);
const PUBLIC_PATHS = new Set([
  '/', '/acerca', '/como-empezar', '/contacto', '/funcionalidades',
  '/privacidad', '/terminos', '/sign-in', '/sign-up',
]);
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const SOURCE_RE = /^[a-z0-9._ -]{1,40}$/i;
const CO_OFFSET_MS = 5 * 60 * 60 * 1000;

export const siteVisitsPublic = new Hono<AppEnv>();

// Responde siempre 204: el navegador no lee la respuesta y así no se filtra qué se descartó.
siteVisitsPublic.post('/', async (c) => {
  try {
    // Solo el sitio en producción: excluye localhost, previews de Vercel y scripts sin Origin.
    if (!ORIGINS_ALLOWED.has(c.req.header('Origin') || '')) return c.body(null, 204);

    const raw = await c.req.text();
    if (raw.length > 2000) return c.body(null, 204);
    const body = JSON.parse(raw) as Record<string, unknown>;

    const deviceId = String(body.device_id ?? '');
    const sessionId = String(body.session_id ?? '');
    if (!ID_RE.test(deviceId) || !ID_RE.test(sessionId)) return c.body(null, 204);

    const firstSegment = String(body.path ?? '').split(/[?#]/)[0].split('/')[1] ?? '';
    const path = '/' + firstSegment;
    if (!PUBLIC_PATHS.has(path)) return c.body(null, 204);

    const ua = parseUserAgent(c.req.header('User-Agent') || '', body.touch === true);
    if (ua.isBot) return c.body(null, 204);

    // Origen: utm/gclid si vienen en la URL; si no, el dominio del referrer (sin el propio sitio).
    let source: string | null = null;
    const utm = String(body.utm ?? '');
    if (SOURCE_RE.test(utm)) {
      source = utm.toLowerCase();
    } else {
      try {
        const host = new URL(String(body.referrer ?? '')).hostname.toLowerCase().replace(/^www\./, '');
        if (host && host !== 'posib.dev') source = host.slice(0, 60);
      } catch {
        // referrer vacío o inválido: visita directa
      }
    }

    const country = c.req.raw.cf?.country;
    const countryCode = typeof country === 'string' && /^[A-Za-z0-9]{2}$/.test(country) ? country.toUpperCase() : null;

    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO site_visits
         (device_id, session_id, path, source, device_type, os, browser, country, signed_in, is_new_device)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?,
         CASE WHEN EXISTS (SELECT 1 FROM site_visits WHERE device_id = ?) THEN 0 ELSE 1 END`
    )
      .bind(
        deviceId, sessionId, path, source, ua.deviceType, ua.os, ua.browser, countryCode,
        body.signed_in === true ? 1 : 0,
        deviceId
      )
      .run();
  } catch (error) {
    console.error('[site-visits] Error registrando visita:', error);
  }
  return c.body(null, 204);
});

function toSqlUtc(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Inicio (en UTC) del día colombiano de hace `daysAgo` días.
function coDayStartUtc(now: Date, daysAgo: number): string {
  const co = new Date(now.getTime() - CO_OFFSET_MS);
  const start = Date.UTC(co.getUTCFullYear(), co.getUTCMonth(), co.getUTCDate() - daysAgo);
  return toSqlUtc(new Date(start + CO_OFFSET_MS));
}

function coDayLabel(now: Date, daysAgo: number): string {
  const co = new Date(now.getTime() - CO_OFFSET_MS);
  return new Date(Date.UTC(co.getUTCFullYear(), co.getUTCMonth(), co.getUTCDate() - daysAgo))
    .toISOString()
    .slice(0, 10);
}

interface CountRow { label: string; devices: number; visits: number }

export const siteVisitsAdmin = new Hono<AppEnv>();

siteVisitsAdmin.get('/', async (c) => {
  const tenant = c.get('tenant');
  if (!tenant.is_superadmin) {
    return c.json<APIResponse<null>>(
      { success: false, error: 'No tienes permisos para acceder a esta información', data: null },
      403
    );
  }

  try {
    const days = Math.min(Math.max(parseInt(c.req.query('days') || '30', 10) || 30, 1), 365);
    const now = new Date();
    const since = coDayStartUtc(now, days - 1);
    const todayStart = coDayStartUtc(now, 0);
    const db = c.env.DB;

    const groupBy = (col: 'device_type' | 'os' | 'browser' | 'country' | 'source' | 'path', limit: number) =>
      db
        .prepare(
          `SELECT COALESCE(${col}, '') AS label, COUNT(DISTINCT device_id) AS devices, COUNT(*) AS visits
           FROM site_visits WHERE visited_at >= ?
           GROUP BY ${col} ORDER BY devices DESC, visits DESC LIMIT ${limit}`
        )
        .bind(since);

    const [totals, split, today, first, daily, deviceTypes, os, browsers, countries, sources, pages] =
      await db.batch([
        db
          .prepare(
            `SELECT COUNT(*) AS visits, COUNT(DISTINCT device_id) AS devices, COALESCE(SUM(is_new_device), 0) AS new_devices
             FROM site_visits WHERE visited_at >= ?`
          )
          .bind(since),
        db
          .prepare(
            `SELECT COALESCE(SUM(CASE WHEN s = 0 THEN 1 ELSE 0 END), 0) AS anonymous_devices,
                    COALESCE(SUM(CASE WHEN s = 1 THEN 1 ELSE 0 END), 0) AS signed_in_devices
             FROM (SELECT MAX(signed_in) AS s FROM site_visits WHERE visited_at >= ? GROUP BY device_id)`
          )
          .bind(since),
        db
          .prepare(
            `SELECT COUNT(*) AS visits, COUNT(DISTINCT device_id) AS devices
             FROM site_visits WHERE visited_at >= ?`
          )
          .bind(todayStart),
        db.prepare(`SELECT MIN(visited_at) AS first_at FROM site_visits`),
        db
          .prepare(
            `SELECT date(visited_at, '-5 hours') AS day, COUNT(*) AS visits, COUNT(DISTINCT device_id) AS devices
             FROM site_visits WHERE visited_at >= ? GROUP BY day`
          )
          .bind(since),
        groupBy('device_type', 5),
        groupBy('os', 8),
        groupBy('browser', 8),
        groupBy('country', 10),
        groupBy('source', 10),
        groupBy('path', 10),
      ]);

    const t = (totals.results[0] ?? {}) as { visits?: number; devices?: number; new_devices?: number };
    const sp = (split.results[0] ?? {}) as { anonymous_devices?: number; signed_in_devices?: number };
    const td = (today.results[0] ?? {}) as { visits?: number; devices?: number };
    const devices = t.devices ?? 0;
    const newDevices = t.new_devices ?? 0;

    const dailyMap = new Map(
      (daily.results as unknown as Array<{ day: string; visits: number; devices: number }>).map((r) => [r.day, r])
    );
    const dailySeries = Array.from({ length: days }, (_, i) => {
      const day = coDayLabel(now, days - 1 - i);
      const row = dailyMap.get(day);
      return { day, visits: row?.visits ?? 0, devices: row?.devices ?? 0 };
    });

    return c.json<APIResponse<unknown>>({
      success: true,
      data: {
        days,
        tracking_started_at: (first.results[0] as { first_at: string | null } | undefined)?.first_at ?? null,
        totals: {
          visits: t.visits ?? 0,
          devices,
          new_devices: newDevices,
          returning_devices: Math.max(devices - newDevices, 0),
          anonymous_devices: sp.anonymous_devices ?? 0,
          signed_in_devices: sp.signed_in_devices ?? 0,
        },
        today: { visits: td.visits ?? 0, devices: td.devices ?? 0 },
        daily: dailySeries,
        device_types: deviceTypes.results as unknown as CountRow[],
        os: os.results as unknown as CountRow[],
        browsers: browsers.results as unknown as CountRow[],
        countries: countries.results as unknown as CountRow[],
        sources: sources.results as unknown as CountRow[],
        pages: pages.results as unknown as CountRow[],
      },
    });
  } catch (error) {
    console.error('[site-visits] Error obteniendo estadísticas:', error);
    return c.json<APIResponse<null>>(
      { success: false, error: 'No se pudieron cargar las visitas', data: null },
      500
    );
  }
});
