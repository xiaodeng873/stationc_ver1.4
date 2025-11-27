const isDev = import.meta.env.DEV;

const getDebugMode = () => {
  try {
    return localStorage.getItem('debug') === 'true';
  } catch {
    return false;
  }
};

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: any[]) => {
    if (isDev || getDebugMode()) {
      console.log('[INFO]', ...args);
    }
  },

  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  }
};
