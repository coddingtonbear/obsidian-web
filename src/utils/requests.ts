import { countMentions, sendBackgroundRequest } from ".";

import {
  FileMetadataObject,
  ObsidianResponse,
  SearchJsonResponseItem,
  SearchJsonResponseItemWithMetadata,
  UrlMentionContainer,
} from "../types";
import escapeStringRegexp from "escape-string-regexp";

export async function obsidianRequest(
  path: string,
  options: RequestInit
): Promise<ObsidianResponse> {
  const result = await sendBackgroundRequest({
    type: "obsidian-request",
    request: {
      path: path,
      options: options,
    },
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result;
}
export async function obsidianSearchRequest(
  query: Record<string, any>
): Promise<SearchJsonResponseItem[]> {
  const result = await obsidianRequest("/search/", {
    method: "post",
    body: JSON.stringify(query),
    headers: {
      "Content-type": "application/vnd.olrapi.jsonlogic+json",
    },
  });

  return result.data as SearchJsonResponseItem[];
}
export async function getUrlMentions(
  url: string
): Promise<UrlMentionContainer> {
  async function handleMentions() {
    const result = await obsidianSearchRequest({
      regexp: [`${escapeStringRegexp(url)}(?=\\s|\\)|$)`, { var: "content" }],
    });
    return result;
  }

  async function handleDirect(): Promise<SearchJsonResponseItemWithMetadata[]> {
    const results = await obsidianSearchRequest({
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
      pageMetadata.push({
        ...result,
        meta: await getPageMetadata(result.filename),
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
export async function getPageMetadata(
  filename: string
): Promise<FileMetadataObject> {
  const result = await obsidianRequest(`/vault/${filename}`, {
    method: "get",
    headers: {
      Accept: "application/vnd.olrapi.note+json",
    },
  });

  return result.data as FileMetadataObject;
}
export async function openFileInObsidian(
  filename: string
): Promise<ObsidianResponse> {
  return obsidianRequest(`/open/${filename}`, { method: "post" });
}
