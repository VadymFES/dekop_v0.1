export function getAdminPath(): string {
  const path = process.env.ADMIN_PATH_SECRET;
  if (!path) throw new Error('ADMIN_PATH_SECRET is not set');
  return path;
}

export function getAdminUrl(subPath?: string): string {
  const basePath = `/${getAdminPath()}`;
  if (!subPath) return basePath;
  return `${basePath}/${subPath}`;
}

export function getAdminApiUrl(endpoint: string): string {
  return `/${getAdminPath()}/api/${endpoint}`;
}

export const ADMIN_PATH = getAdminPath();
