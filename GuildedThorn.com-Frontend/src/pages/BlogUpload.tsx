import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "@lib/rehypeHighlight";
import "highlight.js/styles/github-dark.css";
import { stripFrontmatter, parseTags } from "@lib/frontmatter";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  Eye,
  Pencil,
  Columns2,
  Loader2,
  Trash2,
} from "lucide-react";
import { Input } from "@components/ui/Input";
import { Textarea } from "@components/ui/TextArea";
import { Button } from "@components/ui/Button";
import { cn } from "@lib/utils";
import { useAuth } from "@components/AuthContext";

const DRAFT_KEY = "blog-upload-draft";
const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

const proseClasses =
  "prose prose-gray max-w-none break-words dark:prose-invert " +
  "prose-a:text-primary prose-a:no-underline hover:prose-a:underline " +
  "prose-img:rounded-xl prose-pre:rounded-xl text-left";

export default function BlogUpload() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const editId = searchParams.get("edit");

  const handleDelete = async () => {
    if (!editId) return;
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/blog/${editId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.text()) || "Delete failed");
      navigate("/blog/pages");
    } catch (err) {
      window.alert((err as Error).message);
    }
  };

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [view, setView] = useState<"write" | "split" | "preview">("write");
  const [status, setStatus] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftRestoredRef = useRef(false);

  /* ---- load post when editing ---- */
  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    fetch(`/api/blog/${editId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title ?? "");
        setContent(data.content ?? "");
      })
      .catch(() =>
        setStatus({ type: "err", msg: "Failed to load post for editing" }),
      )
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  /* ---- restore local draft (new posts only) ---- */
  useEffect(() => {
    if (editId || draftRestoredRef.current) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const { title: t, content: c } = JSON.parse(saved);
      if (t) setTitle(t);
      if (c) setContent(c);
      draftRestoredRef.current = true;
    } catch {
      /* ignore */
    }
  }, [editId]);

  /* ---- autosave draft ---- */
  useEffect(() => {
    if (editId || (!title && !content)) return;
    const id = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content }));
      setSavedAt(new Date());
    }, 800);
    return () => clearTimeout(id);
  }, [title, content, editId]);

  /* ---- textarea editing primitives ---- */
  const applyEdit = useCallback(
    (
      fn: (s: { start: number; end: number; value: string }) => {
        value: string;
        start: number;
        end: number;
      },
    ) => {
      const el = editorRef.current;
      if (!el) return;
      const { value, start, end } = fn({
        start: el.selectionStart,
        end: el.selectionEnd,
        value: el.value,
      });
      setContent(value);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, end);
      });
    },
    [],
  );

  const wrap = useCallback(
    (before: string, after = before, placeholder = "text") => {
      applyEdit(({ start, end, value }) => {
        const selected = value.slice(start, end) || placeholder;
        const next =
          value.slice(0, start) + before + selected + after + value.slice(end);
        const s = start + before.length;
        return { value: next, start: s, end: s + selected.length };
      });
    },
    [applyEdit],
  );

  const prefixLines = useCallback(
    (prefix: string | ((i: number) => string)) => {
      applyEdit(({ start, end, value }) => {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        let lineEnd = value.indexOf("\n", end);
        if (lineEnd === -1) lineEnd = value.length;
        const block = value.slice(lineStart, lineEnd);
        const next =
          value.slice(0, lineStart) +
          block
            .split("\n")
            .map(
              (ln, i) =>
                (typeof prefix === "function" ? prefix(i) : prefix) + ln,
            )
            .join("\n") +
          value.slice(lineEnd);
        return {
          value: next,
          start: lineStart,
          end: next.length - (value.length - lineEnd),
        };
      });
    },
    [applyEdit],
  );

  const insert = useCallback(
    (text: string, selectFrom?: number, selectLen = 0) => {
      applyEdit(({ start, end, value }) => {
        const next = value.slice(0, start) + text + value.slice(end);
        const s = selectFrom != null ? start + selectFrom : start + text.length;
        return { value: next, start: s, end: s + selectLen };
      });
    },
    [applyEdit],
  );

  const insertLink = useCallback(() => {
    applyEdit(({ start, end, value }) => {
      const selected = value.slice(start, end) || "link text";
      const snippet = `[${selected}](url)`;
      const next = value.slice(0, start) + snippet + value.slice(end);
      const urlStart = start + selected.length + 3;
      return { value: next, start: urlStart, end: urlStart + 3 };
    });
  }, [applyEdit]);

  /* ---- image upload (reuses the gallery endpoint) ---- */
  const uploadImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setUploading(true);
      setStatus(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", file.name);
        fd.append("description", "Inline blog image");
        const res = await fetch("/api/gallery", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) throw new Error((await res.text()) || "Upload failed");
        const data = await res.json();
        const url = `/images/gallery/${data.id}.${data.fileType}`;
        insert(`\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`);
      } catch (err) {
        setStatus({
          type: "err",
          msg: `Image upload failed: ${(err as Error).message}`,
        });
      } finally {
        setUploading(false);
      }
    },
    [insert],
  );

  /* ---- keyboard shortcuts inside the editor ---- */
  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = e.metaKey || e.ctrlKey;
    if (e.key === "Tab") {
      e.preventDefault();
      insert("    ");
      return;
    }
    if (!meta) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      wrap("**");
    } else if (k === "i") {
      e.preventDefault();
      wrap("*");
    } else if (k === "k") {
      e.preventDefault();
      insertLink();
    } else if (k === "e") {
      e.preventDefault();
      wrap("`", "`", "code");
    } else if (k === "s") {
      e.preventDefault();
      void handleSubmit();
    } else if (k === "enter") {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting || !title.trim() || !content.trim()) {
      if (!title.trim() || !content.trim())
        setStatus({ type: "err", msg: "Title and content are required" });
      return;
    }
    setStatus(null);
    setSubmitting(true);
    try {
      const url = editId ? `/api/blog/${editId}` : "/api/blog";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content }),
      });
      const text = await res.text();
      let data: { message?: string };
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (res.ok) {
        setStatus({
          type: "ok",
          msg: data.message ?? (editId ? "Post updated!" : "Post published!"),
        });
        if (!editId) {
          setTitle("");
          setContent("");
          setSavedAt(null);
          localStorage.removeItem(DRAFT_KEY);
        }
      } else {
        setStatus({ type: "err", msg: data.message ?? "Request failed" });
      }
    } catch (err) {
      setStatus({ type: "err", msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const clearDraft = useCallback(() => {
    setTitle("");
    setContent("");
    setSavedAt(null);
    localStorage.removeItem(DRAFT_KEY);
    setStatus(null);
  }, []);

  /* ---- toolbar definition ---- */
  const tools: (
    | { icon: typeof Bold; label: string; hint?: string; run: () => void }
    | "sep"
  )[] = [
    { icon: Heading1, label: "Heading 1", run: () => prefixLines("# ") },
    { icon: Heading2, label: "Heading 2", run: () => prefixLines("## ") },
    { icon: Heading3, label: "Heading 3", run: () => prefixLines("### ") },
    "sep",
    { icon: Bold, label: "Bold", hint: `${mod}B`, run: () => wrap("**") },
    { icon: Italic, label: "Italic", hint: `${mod}I`, run: () => wrap("*") },
    { icon: Strikethrough, label: "Strikethrough", run: () => wrap("~~") },
    {
      icon: Code,
      label: "Inline code",
      hint: `${mod}E`,
      run: () => wrap("`", "`", "code"),
    },
    "sep",
    { icon: Quote, label: "Quote", run: () => prefixLines("> ") },
    { icon: List, label: "Bullet list", run: () => prefixLines("- ") },
    {
      icon: ListOrdered,
      label: "Numbered list",
      run: () => prefixLines((i) => `${i + 1}. `),
    },
    "sep",
    { icon: Link2, label: "Link", hint: `${mod}K`, run: insertLink },
    {
      icon: ImageIcon,
      label: "Image",
      run: () => fileInputRef.current?.click(),
    },
    {
      icon: TableIcon,
      label: "Table",
      run: () =>
        insert("\n| Column | Column |\n| --- | --- |\n| Cell | Cell |\n"),
    },
    { icon: Minus, label: "Divider", run: () => insert("\n\n---\n\n") },
    { icon: Code, label: "Code block", run: () => insert("\n```\n\n```\n", 5) },
  ];

  const words = wordCount(content);
  const readMins = Math.max(1, Math.round(words / 200));
  const chars = content.length;
  const lines = content === "" ? 0 : content.split("\n").length;

  if (loadingEdit) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading post…
      </div>
    );
  }

  const editor = (
    <Textarea
      ref={editorRef}
      value={content}
      onChange={(e) => setContent(e.target.value)}
      onKeyDown={onEditorKeyDown}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void uploadImage(f);
      }}
      onPaste={(e) => {
        const img = Array.from(e.clipboardData.files).find((f) =>
          f.type.startsWith("image/"),
        );
        if (img) {
          e.preventDefault();
          void uploadImage(img);
        }
      }}
      placeholder="Write in Markdown… drag, paste, or use the image button to add images."
      required
      className={cn(
        "h-full min-h-[60vh] resize-none rounded-none border-0 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0",
        dragActive && "ring-2 ring-inset ring-primary",
      )}
    />
  );

  const detectedTags = parseTags(content);
  const preview = (
    <div className="h-full min-h-[60vh] overflow-auto bg-background p-5">
      {content ? (
        <>
          {detectedTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {detectedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className={proseClasses}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {stripFrontmatter(content)}
            </ReactMarkdown>
          </div>
        </>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Nothing to preview yet.
        </p>
      )}
    </div>
  );

  return (
    <div className="page text-left">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gap-3">
            {editId ? "Edit Post" : "New Post"}
          </h1>
          {!editId && (
            <p className="text-xs text-muted-foreground">
              {savedAt
                ? `Draft saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Drafts save automatically"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 py-4">
          {!editId && (title || content) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearDraft}
            >
              Clear draft
            </Button>
          )}
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
          >
            {submitting ? "Saving…" : editId ? "Update Post" : "Publish Post"}
          </Button>
          {editId && isOwner && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
        required
        className="h-12 text-lg font-semibold"
      />

      {/* editor shell */}
      <div className="panel overflow-hidden">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1.5">
          {tools.map((t, i) =>
            t === "sep" ? (
              <span key={i} className="mx-1 h-5 w-px bg-border" />
            ) : (
              <button
                key={i}
                type="button"
                title={t.hint ? `${t.label} (${t.hint})` : t.label}
                aria-label={t.label}
                onClick={t.run}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <t.icon className="h-4 w-4" />
              </button>
            ),
          )}

          {uploading && (
            <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </span>
          )}

          {/* view switch */}
          <div className="ml-auto flex gap-0.5 rounded-lg border border-border bg-background p-0.5">
            {(
              [
                ["write", Pencil, "Write"],
                ["split", Columns2, "Split"],
                ["preview", Eye, "Preview"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                title={label}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* panes */}
        {view === "write" && editor}
        {view === "preview" && preview}
        {view === "split" && (
          <div className="grid grid-cols-2 divide-x divide-border">
            {editor}
            {preview}
          </div>
        )}

        {/* status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <span>
            {words} word{words !== 1 ? "s" : ""} · {chars} chars · {lines} line
            {lines !== 1 ? "s" : ""} · ~{readMins} min read
          </span>
          <span className="hidden md:inline">
            {mod}B bold · {mod}I italic · {mod}K link · {mod}↵ publish
          </span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadImage(f);
          e.target.value = "";
        }}
      />

      {status && (
        <p
          className={cn(
            "text-sm font-medium",
            status.type === "ok" ? "text-success" : "text-destructive",
          )}
        >
          {status.msg}
        </p>
      )}
    </div>
  );
}
