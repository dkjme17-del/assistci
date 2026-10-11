const pino = require('pino');
const { config } = require('./env');

const options = {
  level: config.isTest ? 'silent' : config.logLevel,
};

// Logs lisibles en développement, JSON structuré en production
if (!config.isProduction && !config.isTest) {
  options.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
  };
}

const logger = pino(options);

module.exports = logger;
