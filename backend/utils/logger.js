const winston = require('winston');
const path = require('path');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Console format: human-readable with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// File format: structured JSON (no ANSI colors embedded in log files)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB per file
    maxFiles: 5,               // Keep 5 rotated files
    tailable: true,
  }),
  new winston.transports.File({ 
    filename: path.join(__dirname, '../logs/all.log'),
    format: fileFormat,
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5,
    tailable: true,
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/http.log'),
    level: 'http',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5,
    tailable: true,
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  levels: logLevels,
  transports,
});

module.exports = logger;
