// Environment detection
const isProduction = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'rocketagents.ai' || window.location.hostname === 'www.rocketagents.ai';
  }
  return process.env.NODE_ENV === 'production';
};

const isDevelopment = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }
  return process.env.NODE_ENV === 'development';
};

const getBackendPort = async (): Promise<number> => {
  // In production, don't try to auto-discover ports
  if (isProduction()) {
    return 3001; // Default production port
  }

  // Try to read port from file first (local development)
  try {
    const response = await fetch('/backend-port.txt');
    if (response.ok) {
      const port = parseInt((await response.text()).trim());
      console.log(`Backend port from file: ${port}`);
      return port;
    }
  } catch (error) {
    // File doesn't exist, continue to auto-discovery
  }

  // Auto-discover backend port by trying common ports (local development)
  const commonPorts = [3003, 3002, 3001, 3004, 3005, 3006, 3007, 3008];
  
  for (const port of commonPorts) {
    try {
      // Try the auth login endpoint with a HEAD request to check if backend is running
      const response = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(1000), // 1 second timeout
      });
      // Status 200, 405 (Method Not Allowed), or 404 means server is running
      if (response.status === 200 || response.status === 405 || response.status === 404) {
        console.log(`Backend auto-discovered on port ${port}`);
        return port;
      }
    } catch (error) {
      // Port not available or timeout, try next
      continue;
    }
  }
  
  // Final fallback
  console.log('Using default backend port 3002');
  return 3002;
};

let cachedBackendUrl: string | null = null;

export const getBackendUrl = async (): Promise<string> => {
  if (cachedBackendUrl !== null) {
    return cachedBackendUrl;
  }

  if (isProduction()) {
    // Production environment - use rocketagents.ai domain
    cachedBackendUrl = 'https://rocketagents.ai';
    console.log(`Using production backend URL: ${cachedBackendUrl}`);
  } else {
    // Development environment - use localhost with auto-discovered port
    const port = await getBackendPort();
    cachedBackendUrl = `http://localhost:${port}`;
    console.log(`Using development backend URL: ${cachedBackendUrl}`);
  }
  
  return cachedBackendUrl;
};

// Get the current environment
export const getEnvironment = (): 'production' | 'development' | 'preview' => {
  if (isProduction()) return 'production';
  if (isDevelopment()) return 'development';
  return 'preview'; // For staging/preview deployments
};

// Reset cache function for testing
export const resetBackendUrlCache = () => {
  cachedBackendUrl = null;
};

// Export environment helpers
export { isProduction, isDevelopment };