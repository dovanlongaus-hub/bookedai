import { ChangeEvent, DragEvent, useRef, useState } from 'react';

import type { ImageUploadContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type UploadResponse = {
  filename: string;
  content_type: string;
  size: number;
  url: string;
  path: string;
};

type ImageUploadSectionProps = {
  content: ImageUploadContent;
};

function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    const normalizedBaseUrl = configuredBaseUrl.replace(/\/$/, '');
    return normalizedBaseUrl.endsWith('/api')
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/api`;
  }

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  return '/api';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageUploadSection({ content }: ImageUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  function updateSelectedFile(file: File | null) {
    setError('');
    setResult(null);
    setCopied(false);
    setSelectedFile(file);

    if (!file) {
      setPreviewUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSelectedFile(null);
      setPreviewUrl('');
      setError('Please choose an image file.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return objectUrl;
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    updateSelectedFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    updateSelectedFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!selectedFile || uploading) {
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);
    setCopied(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${getApiBaseUrl()}/uploads/images`, {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as UploadResponse | { detail?: string };
      if (!response.ok) {
        throw new Error(
          'detail' in data && data.detail
            ? data.detail
            : 'Image upload failed. Please try again.',
        );
      }

      setResult(data as UploadResponse);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Image upload failed. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleCopy() {
    if (!result?.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy the image URL. Please copy it manually.');
    }
  }

  return (
    <section id="image-upload" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <SectionHeading
          kicker={content.kicker}
          kickerClassName={content.kickerClassName}
          title={content.title}
          body={content.body}
        />

        <div className="rounded-[2rem] border border-black/5 bg-white/90 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-7">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`flex w-full flex-col items-center justify-center rounded-[1.75rem] border border-dashed px-6 py-12 text-center transition ${
              dragActive
                ? 'border-amber-400 bg-amber-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-2xl text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
              ↑
            </div>
            <div className="mt-5 text-xl font-semibold text-slate-950">
              Drag and drop an image here
            </div>
            <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
              {content.helperText}
            </p>
            <div className="mt-4 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700">
              Or click to choose a file
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mt-5 flex flex-wrap gap-2">
            {content.acceptedFormats.map((format) => (
              <span
                key={format}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
              >
                {format}
              </span>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected upload preview"
                  className="h-full min-h-64 w-full object-cover"
                />
              ) : (
                <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm leading-7 text-slate-400">
                  Image preview will appear here as soon as you choose a file.
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Upload Status
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-500">Selected file</div>
                <div className="mt-2 text-base font-semibold text-slate-950">
                  {selectedFile?.name ?? 'No file selected'}
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {selectedFile ? formatBytes(selectedFile.size) : 'Waiting for image'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="mt-5 w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,23,42,0.14)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {uploading ? 'Uploading...' : content.uploadLabel}
              </button>

              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {result ? (
                <div className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm font-semibold text-emerald-800">
                    Upload complete
                  </div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block break-all text-sm leading-7 text-slate-700 underline decoration-slate-300 underline-offset-4"
                  >
                    {result.url}
                  </a>
                  <div className="mt-2 text-sm text-slate-500">
                    {result.filename} · {formatBytes(result.size)}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-4 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                  >
                    {copied ? 'Copied' : content.copyLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
