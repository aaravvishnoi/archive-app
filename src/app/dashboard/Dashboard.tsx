"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download, Trash2, Upload, Search, Lock as LockIcon } from "lucide-react";
import { decryptBlob, encryptBlob, VAULT_CHECK_PATH_SUFFIX } from "@/lib/crypto";

const BUCKET = "files";

type FileRow = {
  name: string;
  path: string;
  size: number;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Dashboard({
  userId,
  passphrase,
  onLock,
}: {
  userId: string;
  passphrase: string;
  onLock: () => void;
}) {
  const supabase = createClient();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list(userId, {
      sortBy: { column: "created_at", order: "desc" },
      limit: 200,
    });
    if (error) {
      setError(error.message);
    } else {
      setFiles(
        (data ?? [])
          .filter(
            (f) =>
              f.name !== ".emptyFolderPlaceholder" &&
              f.name !== VAULT_CHECK_PATH_SUFFIX
          )
          .map((f) => ({
            name: f.name,
            path: `${userId}/${f.name}`,
            size: f.metadata?.size ?? 0,
            createdAt: f.created_at ?? new Date().toISOString(),
          }))
      );
    }
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setUploading(true);
      setError(null);
      const existingNames = new Set(files.map((f) => f.name));

      for (const file of Array.from(fileList)) {
        let name = file.name;
        if (existingNames.has(name)) {
          const dot = name.lastIndexOf(".");
          const stamp = Date.now();
          name =
            dot > 0
              ? `${name.slice(0, dot)} (${stamp})${name.slice(dot)}`
              : `${name} (${stamp})`;
        }
        existingNames.add(name);

        try {
          const bytes = await file.arrayBuffer();
          const encrypted = await encryptBlob(bytes, passphrase);

          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(`${userId}/${name}`, encrypted, {
              upsert: false,
              contentType: "application/octet-stream",
            });

          if (error) setError(error.message);
        } catch {
          setError(`Couldn't encrypt "${file.name}".`);
        }
      }

      setUploading(false);
      refresh();
    },
    [files, refresh, supabase, userId]
  );

  async function handleDownload(path: string, name: string) {
    setError(null);
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) {
      setError(error?.message ?? "Could not download that file.");
      return;
    }

    try {
      const plainBytes = await decryptBlob(data, passphrase);
      const url = URL.createObjectURL(new Blob([plainBytes]));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decrypt that file.");
    }
  }

  async function handleDelete(path: string) {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      setError(error.message);
    } else {
      setFiles((prev) => prev.filter((f) => f.path !== path));
    }
  }

  const visible = files.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed rounded-sm px-6 py-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-brass bg-surface-raised"
            : "border-hairline hover:border-brass-bright"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <Upload className="mx-auto mb-3 text-paper-dim" size={20} />
        <p className="text-sm text-paper">
          {uploading ? "Uploading…" : "Drop files here, or click to choose"}
        </p>
        <p className="text-xs text-paper-dim mt-1">
          Encrypted in your browser before upload. Only you can read them.
        </p>
      </div>

      {error && (
        <p className="text-sm text-brick-bright border border-brick/40 bg-brick/10 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-b border-hairline pb-3">
        <Search size={15} className="text-paper-dim" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your files"
          className="bg-transparent text-sm text-paper placeholder:text-paper-dim focus:outline-none flex-1"
        />
        <span className="font-mono text-xs text-paper-dim">
          {files.length} {files.length === 1 ? "file" : "files"}
        </span>
        <button
          onClick={onLock}
          className="flex items-center gap-1.5 text-xs text-paper-dim hover:text-brass-bright transition-colors"
        >
          <LockIcon size={13} />
          Lock
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-paper-dim">Loading your archive…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-paper-dim py-8 text-center">
          {files.length === 0
            ? "Nothing here yet. Upload your first file above."
            : "No files match that search."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((file) => (
            <li
              key={file.path}
              className="flex items-center justify-between gap-4 py-3 border-b border-hairline-soft group"
            >
              <span className="text-sm text-paper truncate flex-1">
                {file.name}
              </span>
              <span className="font-mono text-xs text-paper-dim w-16 text-right shrink-0">
                {formatBytes(file.size)}
              </span>
              <span className="font-mono text-xs text-paper-dim w-14 text-right shrink-0">
                {formatDate(file.createdAt)}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleDownload(file.path, file.name)}
                  aria-label={`Download ${file.name}`}
                  className="text-paper-dim hover:text-brass-bright transition-colors"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => handleDelete(file.path)}
                  aria-label={`Delete ${file.name}`}
                  className="text-paper-dim hover:text-brick-bright transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
