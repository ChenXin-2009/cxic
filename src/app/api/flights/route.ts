/**
 * 航班数据 API 代理路由
 *
 * GET /api/flights?lamin=&lomin=&lamax=&lomax=
 *
 * 功能:
 * - 代理 OpenSky Network API，绕过浏览器 CORS 限制
 * - OAuth2 Client Credentials Flow 认证（token 自动刷新）
 * - 服务端缓存（默认 15 秒，与 OpenSky 匿名限制对齐）
 * - 支持 bounding box 过滤
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENSKY_BASE = 'https://opensky-network.org/api';
const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

// 匿名用户最短请求间隔 10s，缓存 15s 留余量
const CACHE_TTL = 15 * 1000;
// token 提前 60s 刷新
const TOKEN_REFRESH_MARGIN = 60 * 1000;

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface TokenEntry {
  accessToken: string;
  expiresAt: number; // ms timestamp
}

// 内存缓存（Vercel serverless 单实例内有效）
const cache = new Map<string, CacheEntry>();
let tokenEntry: TokenEntry | null = null;

function isCacheValid(entry: CacheEntry | undefined): boolean {
  return !!entry && Date.now() - entry.timestamp < CACHE_TTL;
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // 复用未过期的 token
  if (tokenEntry && Date.now() < tokenEntry.expiresAt - TOKEN_REFRESH_MARGIN) {
    return tokenEntry.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    console.error('[API/flights] token fetch failed:', res.status);
    return null;
  }

  const json = await res.json() as { access_token: string; expires_in: number };
  tokenEntry = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };

  return tokenEntry.accessToken;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lamin = searchParams.get('lamin');
  const lomin = searchParams.get('lomin');
  const lamax = searchParams.get('lamax');
  const lomax = searchParams.get('lomax');

  const params = new URLSearchParams();
  if (lamin) params.set('lamin', lamin);
  if (lomin) params.set('lomin', lomin);
  if (lamax) params.set('lamax', lamax);
  if (lomax) params.set('lomax', lomax);

  const cacheKey = params.toString() || 'global';
  const cached = cache.get(cacheKey);

  if (isCacheValid(cached)) {
    return NextResponse.json(cached!.data, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const url = `${OPENSKY_BASE}/states/all${params.size ? `?${params}` : ''}`;
    const headers: HeadersInit = { 'User-Agent': 'CXIC/1.0' };

    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    // token 过期，清除后重试一次
    if (response.status === 401) {
      tokenEntry = null;
      const freshToken = await getAccessToken();
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        const retry = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        if (!retry.ok) {
          return cached
            ? NextResponse.json(cached.data, { headers: { 'X-Cache': 'STALE' } })
            : NextResponse.json({ error: `OpenSky API error: ${retry.status}` }, { status: retry.status });
        }
        const data = await retry.json();
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
      }
    }

    if (!response.ok) {
      return cached
        ? NextResponse.json(cached.data, { headers: { 'X-Cache': 'STALE' } })
        : NextResponse.json({ error: `OpenSky API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    cache.set(cacheKey, { data, timestamp: Date.now() });
    if (cache.size > 50) {
      for (const [key, entry] of cache) {
        if (!isCacheValid(entry)) cache.delete(key);
      }
    }

    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API/flights] fetch failed:', msg);

    if (cached) {
      return NextResponse.json(cached.data, { headers: { 'X-Cache': 'STALE' } });
    }

    return NextResponse.json({ error: `获取航班数据失败: ${msg}` }, { status: 502 });
  }
}
