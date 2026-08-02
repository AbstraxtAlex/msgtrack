const rawBasePath = import.meta.env.BASE_URL || '/';

export const appBasePath = rawBasePath === '/' ? '' : rawBasePath.replace(/\/+$/, '');

export function withBasePath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${appBasePath}${normalizedPath}` || normalizedPath;
}

export function pathWithoutBase(pathname: string) {
  if (!appBasePath || !pathname.startsWith(appBasePath)) return pathname;
  return pathname.slice(appBasePath.length) || '/';
}
