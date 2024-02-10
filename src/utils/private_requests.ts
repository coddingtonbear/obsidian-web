import escapeStringRegexp from "escape-string-regexp";
import {
  FileMetadataObject,
  SearchJsonResponseItem,
  SearchJsonResponseItemWithMetadata,
  UrlMentionContainer,
} from "../types";

export async function _getUrlMentions(
  hostname: string,
  apiKey: string,
  insecureMode: boolean,
  url: string
): Promise<UrlMentionContainer> {
  async function handleMentions() {
    const result = await _obsidianSearchRequest(
      hostname,
      apiKey,
      insecureMode,
      {
        regexp: [`${escapeStringRegexp(url)}(?=\\s|\\)|$)`, { var: "content" }],
      }
    );
    return result;
  }

  async function handleDirect(): Promise<SearchJsonResponseItemWithMetadata[]> {
    const results = await _obsidianSearchRequest(
      hostname,
      apiKey,
      insecureMode,
      {
        or: [
          { glob: [{ var: "frontmatter.url" }, url] },
          {
            some: [
              { var: "frontmatter.url-aliases" },
              { glob: [{ var: "" }, url] },
            ],
          },
        ],
      }
    );
    const pageMetadata: SearchJsonResponseItemWithMetadata[] = [];
    for (const result of results) {
      const meta = await _getPageMetadata(
        hostname,
        apiKey,
        insecureMode,
        result.filename
      );
      pageMetadata.push({
        ...result,
        meta,
      });
    }
    return pageMetadata;
  }

  return {
    mentions: await handleMentions(),
    direct: await handleDirect(),
  };
}
export async function _obsidianSearchRequest(
  hostname: string,
  apiKey: string,
  insecureMode: boolean,
  query: Record<string, any>
): Promise<SearchJsonResponseItem[]> {
  const result = await _obsidianRequest(
    hostname,
    apiKey,
    "/search/",
    {
      method: "post",
      body: JSON.stringify(query),
      headers: {
        "Content-type": "application/vnd.olrapi.jsonlogic+json",
      },
    },
    insecureMode
  );

  return (await result.json()) as SearchJsonResponseItem[];
}
export async function _obsidianRequest(
  hostname: string,
  apiKey: string,
  path: string,
  options: RequestInit,
  insecureMode: boolean
): ReturnType<typeof fetch> {
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${apiKey}`,
    },
    method: options.method?.toUpperCase(),
    mode: "cors",
  };

  return fetch(
    `http${insecureMode ? "" : "s"}://${hostname}:${
      insecureMode ? "27123" : "27124"
    }${path}`,
    requestOptions
  );
}
export async function _getPageMetadata(
  hostname: string,
  apiKey: string,
  insecureMode: boolean,
  filename: string
): Promise<FileMetadataObject> {
  const result = await _obsidianRequest(
    hostname,
    apiKey,
    `/vault/${filename}`,
    {
      method: "get",
      headers: {
        Accept: "application/vnd.olrapi.note+json",
      },
    },
    insecureMode
  );

  return (await result.json()) as FileMetadataObject;
}
