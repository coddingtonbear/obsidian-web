import escapeStringRegexp from "escape-string-regexp";
import {
  FileMetadataObject,
  SearchJsonResponseItem,
  SearchJsonResponseItemWithMetadata,
  UrlMentionContainer,
} from "../types";
import { countMentions } from ".";

export async function _getUrlMentions(
  apiUrl: string,
  apiKey: string,
  url: string
): Promise<UrlMentionContainer> {
  async function handleMentions() {
    const result = await _obsidianSearchRequest(apiUrl, apiKey, {
      regexp: [`${escapeStringRegexp(url)}(?=\\s|\\)|$)`, { var: "content" }],
    });
    return result;
  }

  async function handleDirect(): Promise<SearchJsonResponseItemWithMetadata[]> {
    const results = await _obsidianSearchRequest(apiUrl, apiKey, {
      or: [
        { glob: [{ var: "frontmatter.url" }, url] },
        {
          some: [
            { var: "frontmatter.url-aliases" },
            { glob: [{ var: "" }, url] },
          ],
        },
      ],
    });
    const pageMetadata: SearchJsonResponseItemWithMetadata[] = [];
    for (const result of results) {
      const meta = await _getPageMetadata(apiUrl, apiKey, result.filename);
      pageMetadata.push({
        ...result,
        meta,
      });
    }
    return pageMetadata;
  }

  const mentions = await handleMentions();
  const direct = await handleDirect();

  return {
    mentions,
    direct,
    count: countMentions(mentions, direct),
  };
}
export async function _obsidianSearchRequest(
  apiUrl: string,
  apiKey: string,
  query: Record<string, any>
): Promise<SearchJsonResponseItem[]> {
  const result = await _obsidianRequest(apiUrl, apiKey, "/search/", {
    method: "post",
    body: JSON.stringify(query),
    headers: {
      "Content-type": "application/vnd.olrapi.jsonlogic+json",
    },
  });

  return (await result.json()) as SearchJsonResponseItem[];
}
export async function _obsidianRequest(
  apiUrl: string,
  apiKey: string,
  path: string,
  options: RequestInit
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

  const url = new URL(path, apiUrl);

  return fetch(url.href, requestOptions);
}
export async function _getPageMetadata(
  hostname: string,
  apiUrl: string,
  filename: string
): Promise<FileMetadataObject> {
  const result = await _obsidianRequest(
    hostname,
    apiUrl,
    `/vault/${filename}`,
    {
      method: "get",
      headers: {
        Accept: "application/vnd.olrapi.note+json",
      },
    }
  );

  return (await result.json()) as FileMetadataObject;
}
