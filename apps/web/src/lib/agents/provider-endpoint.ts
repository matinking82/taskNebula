import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

export class UnsafeAgentProviderEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeAgentProviderEndpointError';
  }
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }
  const [a, b, c] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0] ?? '';
  const groups = normalized.split(':');
  const firstGroup = Number.parseInt(groups[0] || '0', 16);
  const secondGroup = Number.parseInt(groups[1] || '0', 16);

  // Provider callbacks only need globally routable unicast destinations.
  // Restricting literals and DNS answers to 2000::/3 also rejects loopback,
  // ULA/link-local, multicast, IPv4-mapped (including hexadecimal spellings),
  // NAT64 well-known prefixes, and other special-purpose ranges that can
  // otherwise bypass dotted-IPv4 checks.
  if (!Number.isInteger(firstGroup) || (firstGroup & 0xe000) !== 0x2000) {
    return true;
  }

  // Documentation and IETF protocol-assignment blocks are not valid provider
  // destinations. Keep them out even though they sit inside global unicast.
  if (
    normalized.startsWith('2001:db8:') ||
    normalized === '2001:db8::' ||
    /^2001:0{0,3}[0-7]:/.test(normalized) ||
    (firstGroup === 0x3fff && secondGroup <= 0x0fff)
  ) {
    return true;
  }

  // 6to4 embeds an IPv4 destination in groups two and three. Reject a 6to4
  // spelling whenever that embedded address would be rejected directly.
  const sixToFour = normalized.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})(?::|$)/);
  if (sixToFour) {
    const high = Number.parseInt(sixToFour[1]!, 16);
    const low = Number.parseInt(sixToFour[2]!, 16);
    const embedded = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
    return isPrivateIpv4(embedded);
  }

  return false;
}

export function isPublicNetworkAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !isPrivateIpv4(address);
  if (family === 6) return !isPrivateIpv6(address);
  return false;
}

function configuredHostAllowlist(): string[] {
  return (process.env.AGENT_PROVIDER_HOST_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeHostname(hostname: string): string {
  const normalized = hostname.toLowerCase();
  return normalized.startsWith('[') && normalized.endsWith(']')
    ? normalized.slice(1, -1)
    : normalized;
}

export function hostMatchesAllowlist(hostname: string, allowlist: readonly string[]): boolean {
  const candidate = normalizeHostname(hostname);
  return allowlist.some((entry) => {
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1);
      return candidate.endsWith(suffix) && candidate !== suffix.slice(1);
    }
    return candidate === entry;
  });
}

/**
 * Validate a remotely configured agent endpoint before server-side dispatch.
 * HTTPS, optional explicit host policy, and public DNS answers are required.
 * Local CLI endpoints are handled by local-runner.ts and never reach here.
 */
interface ResolvedAgentProviderEndpoint {
  endpoint: URL;
  addresses: Array<{ address: string; family: 4 | 6 }>;
}

async function resolveAgentProviderEndpoint(
  rawEndpoint: string
): Promise<ResolvedAgentProviderEndpoint> {
  let endpoint: URL;
  try {
    endpoint = new URL(rawEndpoint);
  } catch {
    throw new UnsafeAgentProviderEndpointError('Agent provider endpoint is not a valid URL.');
  }

  if (endpoint.protocol !== 'https:') {
    throw new UnsafeAgentProviderEndpointError('Agent provider endpoint must use HTTPS.');
  }
  if (endpoint.username || endpoint.password) {
    throw new UnsafeAgentProviderEndpointError(
      'Agent provider endpoint must not embed credentials.'
    );
  }

  const hostname = normalizeHostname(endpoint.hostname);
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new UnsafeAgentProviderEndpointError('Agent provider endpoint host is not public.');
  }

  const allowlist = configuredHostAllowlist();
  if (allowlist.length > 0 && !hostMatchesAllowlist(hostname, allowlist)) {
    throw new UnsafeAgentProviderEndpointError('Agent provider endpoint host is not allowlisted.');
  }

  const literalFamily = isIP(hostname);
  if (literalFamily && !isPublicNetworkAddress(hostname)) {
    throw new UnsafeAgentProviderEndpointError('Agent provider endpoint address is not public.');
  }

  let answers: Array<{ address: string; family: number }> = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : [];
  if (!literalFamily) {
    try {
      answers = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new UnsafeAgentProviderEndpointError(
        'Agent provider endpoint host could not be resolved.'
      );
    }
  }

  if (answers.length === 0 || answers.some(({ address }) => !isPublicNetworkAddress(address))) {
    throw new UnsafeAgentProviderEndpointError(
      'Agent provider endpoint resolved to a non-public address.'
    );
  }

  return {
    endpoint,
    addresses: answers.map(({ address, family }) => ({
      address,
      family: family as 4 | 6,
    })),
  };
}

export async function validateAgentProviderEndpoint(rawEndpoint: string): Promise<URL> {
  return (await resolveAgentProviderEndpoint(rawEndpoint)).endpoint;
}

interface AgentProviderPostOptions {
  body: string;
  headers: Record<string, string>;
  signal: AbortSignal;
}

interface AgentProviderPostResponse {
  ok: boolean;
  status: number;
}

/**
 * Send one non-redirecting HTTPS request to a freshly validated and pinned
 * public address. The custom lookup closes the DNS-rebinding window between
 * policy validation and the TCP connection; 3xx responses are returned as
 * failures and are never followed to a second destination.
 */
export async function postAgentProviderEndpoint(
  rawEndpoint: string,
  options: AgentProviderPostOptions
): Promise<AgentProviderPostResponse> {
  const { endpoint, addresses } = await resolveAgentProviderEndpoint(rawEndpoint);
  const pinned = addresses[0];
  if (!pinned) {
    throw new UnsafeAgentProviderEndpointError('Agent provider endpoint has no public address.');
  }

  return new Promise<AgentProviderPostResponse>((resolve, reject) => {
    const request = httpsRequest(
      endpoint,
      {
        method: 'POST',
        headers: options.headers,
        signal: options.signal,
        family: pinned.family,
        lookup: (_hostname, _options, callback) => {
          callback(null, pinned.address, pinned.family);
        },
      },
      (response) => {
        response.resume();
        const status = response.statusCode ?? 0;
        resolve({ ok: status >= 200 && status < 300, status });
      }
    );
    request.once('error', reject);
    request.end(options.body);
  });
}
