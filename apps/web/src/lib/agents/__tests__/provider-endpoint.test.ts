import {
  hostMatchesAllowlist,
  isPublicNetworkAddress,
  postAgentProviderEndpoint,
  validateAgentProviderEndpoint,
} from '../provider-endpoint';

const mockHttpsRequest = jest.fn();

jest.mock('node:https', () => ({
  request: (...args: unknown[]) => mockHttpsRequest(...args),
}));

describe('agent provider endpoint network policy', () => {
  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '198.51.100.10',
    '203.0.113.10',
    '::',
    '::1',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::',
  ])('rejects non-public address %s', (address) => {
    expect(isPublicNetworkAddress(address)).toBe(false);
  });

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])(
    'accepts public address %s',
    (address) => {
      expect(isPublicNetworkAddress(address)).toBe(true);
    }
  );

  it('supports exact and explicit wildcard host allowlist entries', () => {
    const allowlist = ['agents.example.com', '*.trusted.example'];
    expect(hostMatchesAllowlist('agents.example.com', allowlist)).toBe(true);
    expect(hostMatchesAllowlist('runner.trusted.example', allowlist)).toBe(true);
    expect(hostMatchesAllowlist('trusted.example', allowlist)).toBe(false);
    expect(hostMatchesAllowlist('evil-example.com', allowlist)).toBe(false);
  });

  it('requires credential-free HTTPS and a public destination', async () => {
    await expect(validateAgentProviderEndpoint('http://8.8.8.8/agent')).rejects.toThrow(/HTTPS/);
    await expect(
      validateAgentProviderEndpoint('https://user:secret@8.8.8.8/agent')
    ).rejects.toThrow(/credentials/);
    await expect(validateAgentProviderEndpoint('https://127.0.0.1/agent')).rejects.toThrow(
      /public/
    );
    await expect(validateAgentProviderEndpoint('https://[::1]/agent')).rejects.toThrow(/public/);
    await expect(validateAgentProviderEndpoint('https://8.8.8.8/agent')).resolves.toMatchObject({
      protocol: 'https:',
      hostname: '8.8.8.8',
    });
  });

  it('pins the validated address and never follows provider redirects', async () => {
    const response = {
      statusCode: 302,
      resume: jest.fn(),
    };
    const request = {
      once: jest.fn(),
      end: jest.fn(),
    };
    let requestOptions: {
      lookup?: (
        hostname: string,
        options: unknown,
        callback: (error: Error | null, address: string, family: number) => void
      ) => void;
    } = {};

    mockHttpsRequest.mockImplementationOnce(
      (
        _endpoint: URL,
        options: typeof requestOptions,
        callback: (value: typeof response) => void
      ) => {
        requestOptions = options;
        callback(response);
        return request;
      }
    );

    const result = await postAgentProviderEndpoint('https://8.8.8.8/agent', {
      body: '{"run":true}',
      headers: { 'Content-Type': 'application/json' },
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ ok: false, status: 302 });
    expect(request.end).toHaveBeenCalledWith('{"run":true}');
    expect(response.resume).toHaveBeenCalled();

    const lookupResult = await new Promise<{ address: string; family: number }>(
      (resolve, reject) => {
        requestOptions.lookup?.('ignored.example', {}, (error, address, family) => {
          if (error) reject(error);
          else resolve({ address, family });
        });
      }
    );
    expect(lookupResult).toEqual({ address: '8.8.8.8', family: 4 });
  });
});
