export function getAdminPath(): string {
  return process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET ?? 'admin-path-57fyg';
}

export function getAdminUrl(subPath?: string): string {
  const basePath = `/${getAdminPath()}`;
  if (!subPath) return basePath;
  return `${basePath}/${subPath}`;
}

export function getAdminApiUrl(endpoint: string): string {
  return `/${getAdminPath()}/api/${endpoint}`;
}

export const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET ?? 'admin-path-57fyg';
