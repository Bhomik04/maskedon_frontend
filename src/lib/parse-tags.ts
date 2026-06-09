export function parseTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter((tag): tag is string => typeof tag === "string");

  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === "string");
      }
    } catch {
      return [];
    }
  }

  return [];
}