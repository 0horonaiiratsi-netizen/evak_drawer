/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    data?: any;
}

type LogSubscription = (entry: LogEntry) => void;

/**
 * A static service for handling application-wide logging.
 * It logs to the console and maintains an in-memory history for a log viewer.
 */
export class LogService {
    private static logHistory: LogEntry[] = [];
    private static readonly MAX_HISTORY_SIZE = 200;
    private static subscriptions: LogSubscription[] = [];

    private static addEntry(level: LogLevel, message: string, data?: any): void {
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            data,
        };

        this.logHistory.push(entry);
        if (this.logHistory.length > this.MAX_HISTORY_SIZE) {
            this.logHistory.shift();
        }

        this.subscriptions.forEach(callback => callback(entry));
    }

    public static error(message: string, error?: Error | any): void {
        console.error(message, error);
        this.addEntry(LogLevel.ERROR, message, error);
    }

    public static warn(message: string, data?: any): void {
        console.warn(message, data);
        this.addEntry(LogLevel.WARN, message, data);
    }

    public static info(message: string, data?: any): void {
        console.info(message, data);
        this.addEntry(LogLevel.INFO, message, data);
    }
    
    public static debug(message: string, data?: any): void {
        // In a real app, this might be conditional based on a dev flag.
        console.debug(message, data);
        this.addEntry(LogLevel.DEBUG, message, data);
    }

    public static getHistory(): readonly LogEntry[] {
        return this.logHistory;
    }

    public static subscribe(callback: LogSubscription): () => void {
        this.subscriptions.push(callback);
        // Return an unsubscribe function
        return () => {
            const index = this.subscriptions.indexOf(callback);
            if (index > -1) {
                this.subscriptions.splice(index, 1);
            }
        };
    }
}