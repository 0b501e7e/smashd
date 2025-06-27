import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private static instance: Logger;
  private logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];
  private maxLogs = 100; // Keep last 100 logs in memory
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const platform = Platform.OS;
    const prefix = `[${timestamp}][${platform}][${level}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  private addToMemory(level: string, message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: any) {
    const formatted = this.formatMessage('DEBUG', message, data);
    console.log(formatted);
    this.addToMemory('DEBUG', message, data);
    
    // Add breadcrumb to Sentry
    Sentry.addBreadcrumb({
      message,
      level: 'debug',
      data
    });
  }

  info(message: string, data?: any) {
    const formatted = this.formatMessage('INFO', message, data);
    console.info(formatted);
    this.addToMemory('INFO', message, data);
    
    Sentry.addBreadcrumb({
      message,
      level: 'info',
      data
    });
  }

  warn(message: string, data?: any) {
    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    this.addToMemory('WARN', message, data);
    
    Sentry.addBreadcrumb({
      message,
      level: 'warning',
      data
    });
    
    // Capture warning to Sentry
    Sentry.captureMessage(message, 'warning');
  }

  error(message: string, error?: Error | any, data?: any) {
    const formatted = this.formatMessage('ERROR', message, { error: error?.message || error, data });
    console.error(formatted);
    this.addToMemory('ERROR', message, { error: error?.message || error, data });
    
    // Capture error to Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: { message, data }
      });
    } else {
      Sentry.captureMessage(`${message}: ${error}`, 'error');
    }
  }

  // Get all logs for debugging
  getAllLogs(): Array<{ timestamp: string; level: string; message: string; data?: any }> {
    return [...this.logs];
  }

  // Get logs as string for sharing
  getLogsAsString(): string {
    return this.logs.map(log => {
      const data = log.data ? ` ${JSON.stringify(log.data)}` : '';
      return `${log.timestamp} [${log.level}] ${log.message}${data}`;
    }).join('\n');
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Log app startup sequence
  logStartup(step: string, success: boolean = true, error?: any) {
    const message = `Startup: ${step}`;
    
    if (success) {
      this.info(message, { step, success: true });
    } else {
      this.error(message, error, { step, success: false });
    }
  }

  // Log network requests
  logNetworkRequest(method: string, url: string, status?: number, error?: any) {
    const message = `Network: ${method} ${url}`;
    
    if (error) {
      this.error(message, error, { method, url, status });
    } else {
      this.info(message, { method, url, status });
    }
  }

  // Log navigation
  logNavigation(from: string, to: string) {
    this.info(`Navigation: ${from} -> ${to}`, { from, to });
  }

  // Log user actions
  logUserAction(action: string, data?: any) {
    this.info(`User Action: ${action}`, data);
  }
}

export const logger = Logger.getInstance();

// Export convenience functions
export const logStartup = (step: string, success: boolean = true, error?: any) => 
  logger.logStartup(step, success, error);

export const logError = (message: string, error?: Error | any, data?: any) => 
  logger.error(message, error, data);

export const logInfo = (message: string, data?: any) => 
  logger.info(message, data);

export const logWarn = (message: string, data?: any) => 
  logger.warn(message, data);

export const logDebug = (message: string, data?: any) => 
  logger.debug(message, data); 