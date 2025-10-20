/**
 * Prunes an object to include only the specified keys.
 * @param item The object to prune.
 * @param keys The array of keys to keep.
 * @returns A new object with only the desired keys.
 */
function pruneObject<T extends object>(item: T, keys: string[]): Partial<T> {
  const prunedItem: Partial<T> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      prunedItem[key as keyof T] = item[key as keyof T];
    }
  }
  return prunedItem;
}

/**
 * Applies field picking to data, which can be a single object or an array of objects.
 * @param data The data to be processed (object or array of objects).
 * @param fields A comma-separated string of fields to keep.
 * @returns The pruned data, or the original data if fields is not provided.
 */
export function applyFieldPicking(data: any, fields: string | undefined): any {
  if (!fields || typeof fields !== 'string') {
    return data;
  }

  const keysToKeep = fields.split(',').map(f => f.trim()).filter(Boolean);

  if (keysToKeep.length === 0) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => pruneObject(item, keysToKeep));
  } else if (data && typeof data === 'object') {
    return pruneObject(data, keysToKeep);
  }

  // Return original data if it's not an object or array
  return data;
}
