'use client';

/** A styled "Choose image" button over a visually hidden file input (keeps the aria-label tests and screen readers use). */
export function TracingImagePicker({ onFile }: { onFile: (file: File) => void }) {
  return (
    <label className="flex w-full cursor-pointer items-center justify-center rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus-within:ring-2 focus-within:ring-blue-500 hover:bg-gray-600">
      Choose image…
      <input
        type="file"
        accept="image/*"
        aria-label="Load tracing image"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}
