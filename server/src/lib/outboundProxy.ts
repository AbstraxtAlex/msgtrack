import http from 'http';
import https from 'https';
import net from 'net';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * Central egress control: every outgoing HTTP/HTTPS request made by the backend
 * is sent through the proxy in SYNC_PROXY (Tinyproxy bound to the WireGuard VPN).
 *
 * Covered clients:
 *  - native fetch()                      -> undici global dispatcher
 *  - http/https.request/get, axios, got  -> http(s).globalAgent replaced
 *  - anything else built on node:http(s) -> same global agents
 *
 * Env:
 *  SYNC_PROXY           e.g. http://127.0.0.1:8888
 *  SYNC_PROXY_REQUIRED  "true" => refuse to start without SYNC_PROXY (fail closed)
 *  SYNC_NO_PROXY        comma list of hosts that bypass the proxy
 *                       (default: localhost,127.0.0.1,::1 + private ranges)
 *
 * Not affected: inbound HTTP/Socket.IO, MySQL (raw TCP), Prisma engine.
 */

const DEFAULT_NO_PROXY = ['localhost', '127.0.0.1', '::1'];

function isPrivateHost(host: string): boolean {
  if (net.isIPv4(host)) {
    const [a, b] = host.split('.').map(Number);
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  if (net.isIPv6(host)) return host === '::1' || /^f[cd]/i.test(host) || /^fe80/i.test(host);
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal');
}

function buildBypass(extra: string[]) {
  const list = [...DEFAULT_NO_PROXY, ...extra].map(s => s.trim().toLowerCase()).filter(Boolean);
  return (hostRaw: string | undefined | null): boolean => {
    if (!hostRaw) return false;
    const host = hostRaw.toLowerCase().replace(/^\[|\]$/g, '');
    if (isPrivateHost(host)) return true;
    return list.some(p => host === p || host.endsWith(p.startsWith('.') ? p : `.${p}`));
  };
}

/** Agent that decides per request: bypass (direct) or proxy. */
function routingAgent(Base: any, direct: http.Agent, proxied: http.Agent, bypass: (h?: string | null) => boolean): any {
  const agent: any = new (Base as any)();
  agent.addRequest = (req: http.ClientRequest, options: any) => {
    const host = options?.hostname || options?.host;
    const target = bypass(host) ? direct : proxied;
    return (target as any).addRequest(req, options);
  };
  return agent;
}

let installed = false;
let activeProxy: string | null = null;

export function getOutboundProxy() {
  return activeProxy;
}

export function installOutboundProxy() {
  if (installed) return;
  installed = true;

  const proxy = (process.env.SYNC_PROXY || '').trim();
  const required = (process.env.SYNC_PROXY_REQUIRED || '').toLowerCase() === 'true';

  if (!proxy) {
    if (required) {
      throw new Error('SYNC_PROXY is not set but SYNC_PROXY_REQUIRED=true: refusing to start with direct egress');
    }
    console.warn('[outboundProxy] SYNC_PROXY not set: outgoing requests go DIRECT (not via VPN)');
    return;
  }

  const extra = (process.env.SYNC_NO_PROXY || '').split(',');
  const bypass = buildBypass(extra);

  // 1) native fetch (undici). EnvHttpProxyAgent honours noProxy.
  const noProxy = [...DEFAULT_NO_PROXY, ...extra].map(s => s.trim()).filter(Boolean).join(',');
  setGlobalDispatcher(new EnvHttpProxyAgent({ httpProxy: proxy, httpsProxy: proxy, noProxy }));

  // 2) node:http / node:https (axios, got, request-style libs)
  const directHttp = new http.Agent();
  const directHttps = new https.Agent();
  http.globalAgent = routingAgent(http.Agent, directHttp, new HttpProxyAgent(proxy), bypass);
  https.globalAgent = routingAgent(https.Agent, directHttps, new HttpsProxyAgent(proxy), bypass);

  activeProxy = proxy.replace(/\/\/[^@/]*@/, '//***@');
  console.log(`[outboundProxy] outgoing HTTP/HTTPS routed via ${activeProxy}`);
}

installOutboundProxy();
