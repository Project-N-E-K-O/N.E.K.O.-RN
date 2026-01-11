export type DevConnectionConfig = {
  host: string;
  port: number;
  characterName: string;
};

export const DEFAULT_DEV_CONNECTION_CONFIG: DevConnectionConfig = {
  host: '192.168.88.54',
  port: 48911,
  characterName: 'test',
};

export function parseDevConnectionConfig(raw: string): Partial<DevConnectionConfig> | null {
  const text = raw.trim();
  if (!text) return null;

  // 1) JSON: {"host":"x","port":48911,"characterName":"test"}
  try {
    const obj = JSON.parse(text) as any;
    if (obj && typeof obj === 'object') {
      const out: Partial<DevConnectionConfig> = {};
      if (typeof obj.host === 'string' && obj.host.trim()) out.host = obj.host.trim();
      if (typeof obj.port === 'number' && Number.isFinite(obj.port)) out.port = obj.port;
      if (typeof obj.characterName === 'string' && obj.characterName.trim()) out.characterName = obj.characterName.trim();
      if (typeof obj.name === 'string' && obj.name.trim()) out.characterName = obj.name.trim();
      if (Object.keys(out).length > 0) return out;
    }
  } catch {
    // ignore
  }

  // 2) URL-like: nekorn://dev?host=...&port=...&name=...
  try {
    const url = new URL(text);
    const host = (url.searchParams.get('host') || '').trim();
    const portStr = (url.searchParams.get('port') || '').trim();
    const name = (url.searchParams.get('characterName') || url.searchParams.get('name') || '').trim();
    const out: Partial<DevConnectionConfig> = {};
    if (host) out.host = host;
    if (portStr && /^\d+$/.test(portStr)) out.port = Number(portStr);
    if (name) out.characterName = name;

    // 允许直接从 URL 的 host/port 取值（如 http://1.2.3.4:48911）
    if (url.hostname) out.host = url.hostname;
    if (url.port && /^\d+$/.test(url.port)) out.port = Number(url.port);

    if (Object.keys(out).length > 0) return out;
  } catch {
    // ignore
  }

  // 3) host:port 或 host:port?name=xxx
  // 允许 ws:// / http:// 前缀在这里被粗略剥离
  const stripped = text.replace(/^(ws|wss|http|https):\/\//, '');
  const parts = stripped.split('?');
  const hostPort = (parts[0] || '').trim();
  const query = (parts[1] || '').trim();
  const m = hostPort.match(/^([a-zA-Z0-9.\-]+)(?::(\d+))?$/);
  if (m) {
    const out: Partial<DevConnectionConfig> = {};
    if (m[1]) out.host = m[1];
    if (m[2]) out.port = Number(m[2]);
    if (query) {
      try {
        const q = new URLSearchParams(query);
        const name = (q.get('characterName') || q.get('name') || '').trim();
        if (name) out.characterName = name;
      } catch {
        // ignore
      }
    }
    if (Object.keys(out).length > 0) return out;
  }

  return null;
}

export function buildHttpBaseURL(config: Pick<DevConnectionConfig, 'host' | 'port'>): string {
  const host = String(config.host || '').trim();
  const port = Number(config.port);
  return `http://${host}:${port}`;
}
