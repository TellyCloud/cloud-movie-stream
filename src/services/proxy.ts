// Proxy server configuration for TellY Movies Stream
export interface ProxyServer {
  address: string;
  port: number;
  type: 'HTTP' | 'HTTPS' | 'SOCKS5';
  country?: string;
  city?: string;
  responseTime?: number;
  status: 'OK' | 'ERROR';
}

export const proxyServers: ProxyServer[] = [
  { address: '45.136.198.40', port: 3128, type: 'HTTP', country: 'BG', responseTime: 276, status: 'OK' },
  { address: '91.233.223.147', port: 3128, type: 'HTTP', country: 'RU', city: 'Sochi', responseTime: 450, status: 'OK' },
  { address: '198.199.86.11', port: 80, type: 'HTTP', responseTime: 522, status: 'OK' },
  { address: '149.56.24.51', port: 3128, type: 'HTTP', responseTime: 644, status: 'OK' },
  { address: '128.199.202.122', port: 80, type: 'HTTP', responseTime: 823, status: 'OK' },
  { address: '38.190.100.47', port: 999, type: 'HTTP', country: 'PE', city: 'Lima', responseTime: 916, status: 'OK' },
  { address: '164.163.42.56', port: 10000, type: 'HTTP', country: 'AR', city: 'Villa Ángela', responseTime: 1096, status: 'OK' },
  { address: '139.162.78.109', port: 8080, type: 'HTTP', responseTime: 1116, status: 'OK' },
  { address: '64.92.82.61', port: 8081, type: 'HTTP', country: 'PH', responseTime: 1690, status: 'OK' },
  { address: '152.53.194.55', port: 37414, type: 'HTTP', country: 'US', city: 'Las Cruces', responseTime: 2002, status: 'OK' },
  { address: '8.219.97.248', port: 80, type: 'HTTP', country: 'SG', city: 'Singapore', responseTime: 2337, status: 'OK' },
  { address: '41.254.48.66', port: 1976, type: 'HTTP', country: 'LY', city: 'Benghazi', responseTime: 2425, status: 'OK' },
  { address: '72.10.164.178', port: 29065, type: 'HTTP', country: 'SG', city: 'Tampines New Town', responseTime: 2562, status: 'OK' },
  { address: '67.43.228.250', port: 12195, type: 'HTTP', country: 'TH', city: 'Hat Yai', responseTime: 2572, status: 'OK' },
  { address: '46.161.194.69', port: 8085, type: 'HTTP', responseTime: 2783, status: 'OK' },
  { address: '67.43.228.253', port: 24913, type: 'HTTP', country: 'IN', city: 'Chennai', responseTime: 2795, status: 'OK' },
  { address: '72.10.164.178', port: 17723, type: 'HTTP', responseTime: 2979, status: 'OK' },
  { address: '103.122.1.26', port: 8080, type: 'HTTP', responseTime: 3150, status: 'OK' },
  { address: '154.0.14.116', port: 3128, type: 'HTTP', responseTime: 3225, status: 'OK' },
  { address: '190.128.253.218', port: 999, type: 'HTTP', responseTime: 3284, status: 'OK' },
  { address: '152.53.194.55', port: 59837, type: 'HTTP', country: 'US', city: 'Rochester', responseTime: 3419, status: 'OK' },
  { address: '36.95.61.186', port: 8080, type: 'HTTP', responseTime: 4292, status: 'OK' },
  { address: '181.78.49.177', port: 999, type: 'HTTP', responseTime: 4833, status: 'OK' },
  { address: '185.58.17.1', port: 8080, type: 'HTTP', country: 'IE', city: 'Dublin', responseTime: 5492, status: 'OK' },
  { address: '191.97.20.83', port: 999, type: 'HTTP', responseTime: 5668, status: 'OK' },
  { address: '198.199.86.11', port: 8080, type: 'HTTP', responseTime: 5773, status: 'OK' },
  { address: '152.53.194.46', port: 8065, type: 'HTTP', country: 'US', city: 'Houston', responseTime: 5800, status: 'OK' },
  { address: '86.109.3.24', port: 10001, type: 'HTTP', responseTime: 6626, status: 'OK' },
  { address: '103.210.22.17', port: 3128, type: 'HTTP', responseTime: 6992, status: 'OK' },
  { address: '103.138.185.17', port: 84, type: 'HTTP', country: 'IN', city: 'Rāwatbhāta', responseTime: 7629, status: 'OK' },
  { address: '103.139.98.169', port: 8080, type: 'HTTP', responseTime: 7780, status: 'OK' },
  { address: '189.48.37.164', port: 8999, type: 'HTTP', responseTime: 9212, status: 'OK' },
  { address: '190.153.22.149', port: 999, type: 'HTTP', responseTime: 9644, status: 'OK' },
  { address: '183.88.220.245', port: 8080, type: 'HTTP', responseTime: 9724, status: 'OK' },
  { address: '213.233.178.137', port: 3128, type: 'HTTP', country: 'IR', responseTime: 9877, status: 'OK' },
  { address: '161.156.86.87', port: 3128, type: 'HTTP', responseTime: 10204, status: 'OK' },
  { address: '180.191.20.31', port: 8081, type: 'HTTP', responseTime: 11602, status: 'OK' },
  { address: '138.0.140.51', port: 8080, type: 'HTTP', responseTime: 11953, status: 'OK' },
  { address: '177.11.67.160', port: 8999, type: 'HTTP', country: 'BR', city: 'Natal', responseTime: 13671, status: 'OK' },
  { address: '147.75.34.105', port: 443, type: 'HTTP', responseTime: 14901, status: 'OK' },
  { address: '201.230.121.126', port: 999, type: 'HTTP', responseTime: 19015, status: 'OK' }
];

// Get fastest available proxy servers
export function getFastestProxies(count: number = 5): ProxyServer[] {
  return proxyServers
    .filter(proxy => proxy.status === 'OK' && proxy.responseTime)
    .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))
    .slice(0, count);
}

// Get proxy by country
export function getProxiesByCountry(country: string): ProxyServer[] {
  return proxyServers.filter(proxy => 
    proxy.country?.toLowerCase() === country.toLowerCase() && proxy.status === 'OK'
  );
}

// Format proxy URL
export function formatProxyUrl(proxy: ProxyServer): string {
  return `${proxy.type.toLowerCase()}://${proxy.address}:${proxy.port}`;
}

// Get random working proxy
export function getRandomProxy(): ProxyServer | null {
  const workingProxies = proxyServers.filter(proxy => proxy.status === 'OK');
  if (workingProxies.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * workingProxies.length);
  return workingProxies[randomIndex];
}