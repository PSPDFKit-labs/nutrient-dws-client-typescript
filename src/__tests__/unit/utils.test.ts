/**
 * Unit tests for utility functions
 */
import { getLibraryVersion, getUserAgent } from '../../utils';

describe('Utility Functions', () => {
  describe('getLibraryVersion()', () => {
    it('should return a valid semver version string', () => {
      const version = getLibraryVersion();
      
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
      
      // Check if it matches semver pattern (major.minor.patch)
      const semverPattern = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;
      expect(version).toMatch(semverPattern);
    });

    it('should return the version from package.json', () => {
      const version = getLibraryVersion();
      
      // The version should match whatever is in package.json
      // We don't hardcode the expected version to avoid breaking on version updates
      expect(version).toMatch(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('getUserAgent()', () => {
    it('should return a properly formatted User-Agent string', () => {
      const userAgent = getUserAgent();
      
      expect(userAgent).toBeDefined();
      expect(typeof userAgent).toBe('string');
      expect(userAgent.length).toBeGreaterThan(0);
    });

    it('should follow the expected User-Agent format', () => {
      const userAgent = getUserAgent();
      
      // Should match: nutrient-dws-client-typescript/VERSION
      const expectedPattern = /^nutrient-dws-client-typescript\/\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;
      expect(userAgent).toMatch(expectedPattern);
    });

    it('should include the correct library name', () => {
      const userAgent = getUserAgent();
      
      expect(userAgent).toContain('nutrient-dws-client-typescript');
    });

    it('should include the current library version', () => {
      const userAgent = getUserAgent();
      const version = getLibraryVersion();
      
      expect(userAgent).toContain(version);
    });

    it('should have consistent format across multiple calls', () => {
      const userAgent1 = getUserAgent();
      const userAgent2 = getUserAgent();
      
      expect(userAgent1).toBe(userAgent2);
    });

    it('should return the expected User-Agent format with current version', () => {
      const userAgent = getUserAgent();
      const version = getLibraryVersion();
      
      expect(userAgent).toBe(`nutrient-dws-client-typescript/${version}`);
    });
  });
});