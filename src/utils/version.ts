/**
 * Version utility functions
 */
import packageJson from '../../package.json';

/**
 * Gets the current version of the Nutrient DWS TypeScript Client library
 * @returns The version string from package.json
 */
export function getLibraryVersion(): string {
  return packageJson.version;
}

/**
 * Creates a User-Agent string for HTTP requests
 * @returns Formatted User-Agent string identifying this library
 */
export function getUserAgent(): string {
  return `nutrient-dws-client-typescript/${getLibraryVersion()}`;
}
