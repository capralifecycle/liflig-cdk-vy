import { addPathToUrl } from "../url-tools";

test("addPathToUrl with empty path", () => {
  const url = "https://example.com";
  const path = "";
  const result = addPathToUrl({ url, path });

  expect(result).toEqual("https://example.com");
});


test("addPathToUrl with single slash as path", () => {
  const url = "https://example.com";
  const path = "/";
  const result = addPathToUrl({ url, path });

  expect(result).toEqual("https://example.com/");
});

test("addPathToUrl with simple path", () => {
  const url = "https://example.com";
  const path = "/simple";
  const result = addPathToUrl({ url, path });

  expect(result).toEqual("https://example.com/simple");
});

test("addPathToUrl with longer path", () => {
  const url = "https://example.com";
  const path = "/long/path/for/you?isok=yes&no";
  const result = addPathToUrl({ url, path });

  expect(result).toEqual("https://example.com/long/path/for/you?isok=yes&no");
});

test("addPathToUrl with slash in both url and path", () => {
  const url = "https://example.com/";
  const path = "/simple";
  const result = addPathToUrl({ url, path });

  expect(result).toEqual("https://example.com/simple");
});

test("addPathToUrl with slash in url and double slash in path", () => {
  const url = "https://example.com/";
  const path = "//simple";
  const result = addPathToUrl({ url, path });

  expect(result).toEqual("https://example.com//simple");
});

test("addPathToUrl with url without scheme", () => {
  const url = "example.com";
  const path = "/simple";
  const result = addPathToUrl({ url, path });

  expect(result).toEqual("example.com/simple");
});

test("addPathToUrl with url with file scheme", () => {
  const url = "file:///dev/";
  const path = "/null";
  const result = addPathToUrl({ url, path });

  expect(result).toEqual("file:///dev/null");
});
