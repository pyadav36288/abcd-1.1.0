import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logDir = path.join(__dirname, '../../logs');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ABCD2-Backend' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Console logs in development
    ...(process.env.NODE_ENV !== 'production'
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ level, message, timestamp, ...meta }) => {
                const metaString = Object.keys(meta).length
                  ? JSON.stringify(meta, null, 2)
                  : '';
                return `${timestamp} [${level}]: ${message} ${metaString}`;
              })
            ),
          }),
        ]
      : []),
  ],
});

export default logger;

/**
 * Create HTTP request logger
 * Usage: app.use(createHttpLogger());
 */
export function createHttpLogger() {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userId: req.user?.id,
      };

      if (res.statusCode >= 400) {
        logger.warn('HTTP Request', logData);
      } else {
        logger.info('HTTP Request', logData);
      }
    });

    next();
  };
}
