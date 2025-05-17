 // src/util/logger.ts
import Logger from 'js-logger';

// Basic configuration for js-logger
Logger.useDefaults(); // Sets default level to INFO and uses a simple console handler

// Export the configured Logger object directly
export const AppLogger = Logger;

export default AppLogger;