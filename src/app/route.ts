export interface Route {
  /** "/" 또는 "/<gameId>" */
  path: string;
  params: Record<string, string>;
}

export function parseHash(hash: string): Route {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart = "", query = ""] = raw.split("?", 2);
  const path = pathPart === "" ? "/" : pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((value, key) => {
    params[key] = value;
  });
  return { path, params };
}

export function toHash(path: string, params?: Record<string, string>): string {
  const query = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : "";
  return `#${path}${query}`;
}

export function navigate(path: string, params?: Record<string, string>): void {
  window.location.hash = toHash(path, params);
}
