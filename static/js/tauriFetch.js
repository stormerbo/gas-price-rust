/**
 * Tauri 环境下的 fetch 适配器
 * 在 Tauri 中使用原生 HTTP API，在浏览器中使用标准 fetch
 */

// 检测是否在 Tauri 环境中
const isTauri = window.__TAURI__ !== undefined;

console.log('🔍 环境检测:', isTauri ? 'Tauri' : '浏览器');

/**
 * 统一的 fetch 函数
 * 在 Tauri 中使用 Tauri HTTP API，在浏览器中使用标准 fetch
 */
export async function universalFetch(url, options = {}) {
  console.log('🌐 universalFetch 调用:', url, '环境:', isTauri ? 'Tauri' : '浏览器');
  
  if (isTauri) {
    // 在 Tauri 环境中使用 Tauri HTTP API
    try {
      console.log('📡 使用 Tauri HTTP API...');
      const { fetch: tauriFetch } = window.__TAURI__.http;
      
      const response = await tauriFetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
        responseType: 1, // 1 = JSON, 2 = Text, 3 = Binary
      });
      
      console.log('✅ Tauri HTTP 响应:', response);
      
      // 适配为标准 Response 接口
      return {
        ok: response.ok || response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText || '',
        headers: response.headers || {},
        json: async () => {
          // Tauri 的响应数据可能已经是对象
          if (typeof response.data === 'object') {
            return response.data;
          }
          // 或者是 JSON 字符串
          if (typeof response.data === 'string') {
            return JSON.parse(response.data);
          }
          return response.data;
        },
        text: async () => {
          if (typeof response.data === 'string') {
            return response.data;
          }
          return JSON.stringify(response.data);
        },
      };
    } catch (error) {
      console.error('❌ Tauri fetch 错误:', error);
      throw error;
    }
  } else {
    // 在浏览器中使用标准 fetch
    console.log('📡 使用标准 fetch API...');
    return fetch(url, options);
  }
}

/**
 * 检查是否在 Tauri 环境中
 */
export function isTauriEnvironment() {
  return isTauri;
}

/**
 * 获取环境信息（用于调试）
 */
export function getEnvironmentInfo() {
  return {
    isTauri,
    userAgent: navigator.userAgent,
    hasTauriAPI: window.__TAURI__ !== undefined,
  };
}
