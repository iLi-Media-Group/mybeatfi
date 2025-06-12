import React, { useState } from 'react';
import { uploadFile, validateAudioFile } from '../lib/storage';
import { AudioPlayer } from './AudioPlayer';

export function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    const validationError = await validateAudioFile(selectedFile);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      const url = await uploadFile(file, 'track-audio', (progress) => {
        setUploadProgress(progress);
      });

      setUploadedUrl(url);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Test File Upload</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Audio File
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700
                  file:cursor-pointer file:transition-colors"
                disabled={loading}
              />
            </div>

            {file && (
              <div className="text-sm text-gray-400">
                Selected file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Upload File'}
            </button>

            {uploadedUrl && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-2">Upload Complete!</h3>
                <AudioPlayer url={uploadedUrl} title={file?.name || 'Uploaded Track'} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
