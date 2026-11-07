'use client';

export type FileNameAction = 'save' | 'export' | 'export2bpp' | 'exportC' | 'exportMap' | 'export1bpp';

const ACTION_INFO: Record<FileNameAction, { title: string; extension: string }> = {
  save: { title: 'Save Project', extension: '.json' },
  export: { title: 'Export ASM', extension: '.asm' },
  export2bpp: { title: 'Export 2bpp', extension: '.2bpp' },
  exportC: { title: 'Export C', extension: '.h' },
  exportMap: { title: 'Export Tilemap', extension: '.tilemap' },
  export1bpp: { title: 'Export 1bpp', extension: '.1bpp' },
};

interface FileNameModalProps {
  isOpen: boolean;
  action: FileNameAction | null;
  fileName: string;
  onFileNameChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  docsLink?: { href: string; description: string; label?: string };
}

export function FileNameModal({
  isOpen,
  action,
  fileName,
  onFileNameChange,
  onConfirm,
  onCancel,
  docsLink,
}: FileNameModalProps) {
  if (!isOpen) return null;

  const info = (action && ACTION_INFO[action]) || ACTION_INFO.export; // (an unknown action must not crash the dialog)
  const title = info.title;
  const extension = info.extension;
  const confirmLabel = action === 'save' ? 'Save' : info.title;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[28rem] shadow-xl">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Filename</label>
          <div className="flex items-center">
            <input
              type="text"
              value={fileName}
              onChange={(e) => onFileNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm();
                if (e.key === 'Escape') onCancel();
              }}
              autoFocus
              className="flex-1 px-3 py-2 rounded-l bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <span className="px-3 py-2 bg-gray-600 text-gray-300 rounded-r border border-l-0 border-gray-600">
              {extension}
            </span>
          </div>
        </div>
        {action !== 'save' && docsLink && (
          <p className="mb-4 text-sm text-gray-400">
            <a
              href={docsLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {docsLink.label ?? 'How do I use this on a Game Boy?'}
            </a>
            {' '}— {docsLink.description}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
