/**
 * Compare the version of package.json
 */
export function comparePackageVersions(
  v1: string,
  comparator: string,
  v2: string,
): boolean {
  const v1parts = v1.split('.').map(Number);
  const v2parts = v2.split('.').map(Number);
  const maxLength = Math.max(v1parts.length, v2parts.length);

  for (let i = 0; i < maxLength; i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;

    if (v1part === v2part) continue;

    if (v1part > v2part) return comparator === '>' || comparator === '>=';
    if (v1part < v2part) return comparator === '<' || comparator === '<=';
  }

  return comparator === '==' || comparator === '>=' || comparator === '<=';
}
