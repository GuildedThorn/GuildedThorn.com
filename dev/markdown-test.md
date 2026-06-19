# The Full Markdown Test

This post exercises everything the blog renderer can (and can't) do. Each section says what you should see.

---

## 1. Headings

# H1 heading
## H2 heading
### H3 heading
#### H4 heading
##### H5 heading
###### H6 heading

## 2. Emphasis & inline marks

Plain, *italic*, **bold**, ***bold italic***, `inline code`, and a literal \*escaped asterisk\*.

~~Strikethrough~~ — **GFM only**: renders with tildes visible unless `remark-gfm` is installed.

## 3. Paragraphs & line breaks

This line ends with two spaces  
so this should be on a new line (hard break).

This is a separate paragraph after a blank line.

## 4. Blockquotes

> A single-level blockquote.
>
> > A nested blockquote inside it.
>
> Back to the first level, with **bold** and `code` inside.

## 5. Lists

Unordered, nested:

- Alpha
- Bravo
  - Bravo / one
  - Bravo / two
    - Deeper still
- Charlie

Ordered:

1. First
2. Second
3. Third with a nested unordered list:
   - inner point
   - another inner point

Task list — **GFM only**, shows as literal brackets without `remark-gfm`:

- [x] Done item
- [ ] Pending item

## 6. Code blocks

C# (should be syntax highlighted):

```csharp
public record BlogPost(string Title, string Content) {
    public override string ToString() => $"{Title}: {Content[..20]}…";
}
```

TypeScript:

```typescript
const greet = (name: string): string => `Hello, ${name}!`;
console.log(greet("Thorn"));
```

Bash:

```bash
bash dev/up.sh && dotnet run --launch-profile https
```

Nix:

```nix
{ pkgs, ... }: {
  services.guildedthorn.enable = true;
}
```

No language hint (plain block):

```
plain preformatted text
  with preserved   spacing
```

## 7. Links & images

- Inline link: [GuildedThorn.com](https://guildedthorn.com)
- Reference link: [the repo][repo]
- Bare URL (autolink is GFM; without it this stays plain text): https://example.com

[repo]: https://github.com/GuildedThorn

Image from this site's own assets:

![Site logo](/images/Logo.svg)

## 8. Table — GFM only

| Feature | Plugin needed | Renders today? |
| ------- | ------------- | -------------- |
| Tables | remark-gfm | No |
| Strikethrough | remark-gfm | No |
| Headings | none | Yes |

If you see a raw pipe-and-dash block above instead of a real table, `remark-gfm` is not installed.

## 9. Horizontal rule

---

## 10. Raw HTML

<div style="color: red">Raw HTML is ignored by react-markdown by default — this sentence should appear as plain text or not at all, never red.</div>

## 11. Long-content overflow

A very long unbroken string to test horizontal overflow handling:

`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`

---

*End of test. If sections 2 (strikethrough), 5 (task list), 7 (autolink), and 8 (table) look broken, that's expected without `remark-gfm` — everything else should render cleanly.*
