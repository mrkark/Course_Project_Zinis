// frontend/src/components/forms/FileUpload.jsx
import { useState, useCallback, useRef } from 'react';
import { uploadApi } from '../../services/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function FileUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const dragActiveRef = useRef(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      dragActiveRef.current = true;
    } else if (e.type === 'dragleave') {
      dragActiveRef.current = false;
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragActiveRef.current = false;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile) => {
    setError(null);
    setResult(null);
    setProgress(0);
    
    // Validate file
    const allowedExtensions = ['.exe', '.pdf', '.js', '.txt', '.docx', '.zip', '.apk'];
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      setError(`File type ${ext} not allowed. Allowed: ${allowedExtensions.join(', ')}`);
      return;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      setError(`File size exceeds 10MB limit`);
      return;
    }
    
    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    setProgress(0);
    
    try {
      const result = await uploadApi.upload(file, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percent);
      });
      
      setResult(result.data);
      setProgress(100);
      onUploadComplete?.(result.data);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={dragActiveRef.current ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : ''}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload File for Analysis</h2>
      </CardHeader>
      
      <CardContent>
        {!file ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Drag & drop a file here, or click to select</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Supported: .exe, .pdf, .js, .txt, .docx, .zip, .apk (max 10MB)
            </p>
            <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
              Select File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".exe,.pdf,.js,.txt,.docx,.zip,.apk"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <Button variant="ghost" onClick={handleReset}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            
            {error && (
              <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-700 dark:text-danger-300 text-sm">
                {error}
              </div>
            )}
            
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {!uploading && !result && (
              <Button variant="primary" className="w-full" onClick={handleUpload} disabled={!file}>
                Start Analysis
              </Button>
            )}
            
            {result && (
              <div className="space-y-3 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-success-800 dark:text-success-300">Static Analysis Complete</span>
                  <Badge variant={result.data?.verdict?.toLowerCase() || 'info'}>
                    {result.data?.verdict || 'UNKNOWN'}
                  </Badge>
                </div>
                <div className="text-sm text-success-700 dark:text-success-400">
                  Risk Score: <strong>{result.data?.static?.riskScore || 0}</strong> / 100
                </div>
                <p className="text-sm text-success-600 dark:text-success-500">
                  Behavioral emulation started. Navigate to Live Analysis to monitor.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}