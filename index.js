// index.js (MVC Architecture - Optimized Ethereum Event Listener)
import { Application } from './src/Application.js';

/**
 * Application Entry Point
 * Following MVC pattern for scalability and maintainability
 */
async function main() {
  try {
    const app = new Application();
    await app.start();
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
main();