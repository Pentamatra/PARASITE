/** A verified zero stays inspectable without being returned as an active organism. */
export function selectPermission<T extends { key: string; allowance: bigint }>(
  permissions: T[],
  selectedKey?: string,
): T | undefined {
  return (
    permissions.find(permission => permission.key === selectedKey) ??
    permissions.find(permission => permission.allowance > 0n)
  );
}
