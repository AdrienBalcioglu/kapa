'use client';

import { useCallback, useState } from 'react';

interface IconUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  error?: string;
}

export function IconUpload({ value, onChange, error }: IconUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/png')) {
        alert('Please upload a PNG image');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        onChange(base64);
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        App Icon (PNG 1024x1024)
      </label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
          {preview ? (
            <img src={preview} alt="App icon" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div>
          <input
            type="file"
            accept="image/png"
            onChange={handleFileChange}
            className="hidden"
            id="icon-upload"
          />
          <label
            htmlFor="icon-upload"
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Choose file
          </label>
          <p className="mt-1 text-xs text-gray-500">PNG format, 1024x1024 pixels recommended</p>
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
