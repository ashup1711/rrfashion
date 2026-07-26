class Logger {
  private isDev = import.meta.env.DEV;

  debug(...args: unknown[]) {
    if (this.isDev) {
      console.log('[Payment]', ...args);
    }
  }

  error(...args: unknown[]) {
    console.error('[Payment]', ...args);
    // In production, could send to error tracking service
  }
}

export const logger = new Logger();
