import { comparePackageVersions } from '../utils/comparison';

describe('comparePackageJsonVersions', () => {
  test('equal versions return true for ==', () => {
    expect(comparePackageVersions('1.0.0', '==', '1.0.0')).toBe(true);
  });

  test('different versions return false for ==', () => {
    expect(comparePackageVersions('1.0.0', '==', '1.0.1')).toBe(false);
  });

  test('higher version returns true for >', () => {
    expect(comparePackageVersions('1.0.1', '>', '1.0.0')).toBe(true);
  });

  test('lower version returns false for >', () => {
    expect(comparePackageVersions('1.0.0', '>', '1.0.1')).toBe(false);
  });

  test('higher version returns true for >= when versions are equal', () => {
    expect(comparePackageVersions('1.0.0', '>=', '1.0.0')).toBe(true);
  });

  test('higher version returns true for >=', () => {
    expect(comparePackageVersions('1.0.1', '>=', '1.0.0')).toBe(true);
  });

  test('lower version returns false for >=', () => {
    expect(comparePackageVersions('1.0.0', '>=', '1.0.1')).toBe(false);
  });

  test('lower version returns true for <', () => {
    expect(comparePackageVersions('1.0.0', '<', '1.0.1')).toBe(true);
  });

  test('higher version returns false for <', () => {
    expect(comparePackageVersions('1.0.1', '<', '1.0.0')).toBe(false);
  });

  test('lower version returns true for <= when versions are equal', () => {
    expect(comparePackageVersions('1.0.0', '<=', '1.0.0')).toBe(true);
  });

  test('lower version returns true for <=', () => {
    expect(comparePackageVersions('1.0.0', '<=', '1.0.1')).toBe(true);
  });

  test('higher version returns false for <=', () => {
    expect(comparePackageVersions('1.0.1', '<=', '1.0.0')).toBe(false);
  });
});
