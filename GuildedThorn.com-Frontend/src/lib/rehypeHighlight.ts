import type { Element, Root } from "hast";
import { toText } from "hast-util-to-text";
import { createLowlight } from "lowlight";
import { visit } from "unist-util-visit";

// Only the languages we actually use are bundled (each is a few KB), instead of
// rehype-highlight's full `common` set (~35 langs). Add more here as needed:
//   import foo from "highlight.js/lib/languages/foo";  →  register `foo`.
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import java from "highlight.js/lib/languages/java";
import json from "highlight.js/lib/languages/json";
import nix from "highlight.js/lib/languages/nix";
import php from "highlight.js/lib/languages/php";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml"; // also powers HTML

const lowlight = createLowlight({ c, cpp, csharp, java, json, nix, php, typescript, xml });

// Common fence aliases → registered grammars (```html, ```ts, ```cs, ```c++ …).
lowlight.registerAlias({
    xml: ["html", "htm", "xhtml"],
    typescript: ["ts"],
    csharp: ["cs", "c#"],
    cpp: ["c++", "h", "hpp", "cc"],
});

/**
 * Minimal rehype plugin that highlights fenced code blocks with the small
 * lowlight instance above. Mirrors rehype-highlight's behaviour for
 * `<pre><code class="language-*">` but ships only our grammars.
 */
export default function rehypeHighlight() {
    return (tree: Root) => {
        visit(tree, "element", (node: Element, _i, parent) => {
            if (node.tagName !== "code" || !parent || (parent as Element).tagName !== "pre") return;

            const classes = (node.properties.className as string[] | undefined) ?? [];
            const langClass = classes.find(
                (cls) => typeof cls === "string" && cls.startsWith("language-"),
            );
            if (!langClass) return;

            const lang = langClass.slice("language-".length).toLowerCase();
            if (!lowlight.registered(lang)) return;

            const result = lowlight.highlight(lang, toText(node, { whitespace: "pre" }));
            node.properties.className = ["hljs", ...classes];
            node.children = result.children as Element["children"];
        });
    };
}
