// Leading YAML-ish frontmatter block:
//   ---
//   tags: security, homelab, networking
//   ---
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;

/** Remove the leading frontmatter block so it isn't rendered in the post body. */
export function stripFrontmatter(md: string | undefined): string {
    return md ? md.replace(FRONTMATTER, "") : "";
}

/** Parse `tags:` from the frontmatter (comma list or [a, b] array). */
export function parseTags(md: string | undefined): string[] {
    if (!md) return [];
    const block = FRONTMATTER.exec(md);
    if (!block) return [];
    const line = /^tags[ \t]*:[ \t]*(.+)$/m.exec(block[1]);
    if (!line) return [];
    return line[1]
        .trim()
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((t) => t.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
}
