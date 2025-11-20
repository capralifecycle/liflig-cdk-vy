export function addPathToUrl({ url, path }: { url: string; path: string }) {
  if (path.length === 0) {
    // return unmodified url when path is empty
    return url
  }

  const newUrl = url.endsWith("/") ? url.substring(0, url.length - 1) : url;
  const newPath = path.startsWith("/") ? path.substring(1) : path;

  return newUrl.concat("/", newPath);
}
