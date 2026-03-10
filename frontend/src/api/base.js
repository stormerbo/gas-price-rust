const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
let cachedApiBase = null;

function getTauriInvoke() {
  if (!window.__TAURI__) return null;
  return window.__TAURI__.invoke || window.__TAURI__.tauri?.invoke || null;
}

async function resolveTauriPort() {
  const invoke = getTauriInvoke();
  if (!invoke) return 8080;

  for (let i = 0; i < 20; i += 1) {
    try {
      const port = await invoke('get_server_port');
      if (port) return port;
    } catch (_) {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return 8080;
}

export async function getApiBase() {
  if (cachedApiBase) return cachedApiBase;

  if (!isTauri) {
    cachedApiBase = '/api/v1/gas-prices';
    return cachedApiBase;
  }

  const port = await resolveTauriPort();
  cachedApiBase = `http://127.0.0.1:${port}/api/v1/gas-prices`;
  return cachedApiBase;
}
