// frontend/src/pages/Upload.jsx
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/forms/FileUpload';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function Upload() {
  const navigate = useNavigate();

  const handleUploadComplete = (result) => {
    // Optionally navigate to live analysis with scan ID
    if (result.data?.scanId) {
      navigate(`/live?scanId=${result.data.scanId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload & Scan</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Upload a file for static analysis and behavioral emulation
        </p>
      </div>

      <FileUpload onUploadComplete={handleUploadComplete} />

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">How It Works</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">1</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Static Analysis</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  File is analyzed for suspicious strings, URLs, IPs, entropy, and hash calculation.
                  No code is executed during this phase.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center text-warning-600 dark:text-warning-400 font-bold">2</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Behavioral Emulation</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Simulated malware behavior generates real-time events (file ops, network, registry)
                  based on detected threat type. Events stream via WebSocket.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center text-success-600 dark:text-success-400 font-bold">3</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Detection & Verdict</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Combined static + behavioral risk score determines verdict:
                  CLEAN, LOW, MEDIUM, HIGH, or CRITICAL. Results saved to history.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Supported File Types</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { ext: '.exe', desc: 'Windows Executable', icon: '⚙️' },
              { ext: '.pdf', desc: 'PDF Document', icon: '📄' },
              { ext: '.js', desc: 'JavaScript', icon: '📜' },
              { ext: '.txt', desc: 'Text File', icon: '📝' },
              { ext: '.docx', desc: 'Word Document', icon: '📃' },
              { ext: '.zip', desc: 'Archive', icon: '📦' },
              { ext: '.apk', desc: 'Android App', icon: '🤖' },
              { ext: '.dll', desc: 'Dynamic Library', icon: '🔧' },
            ].map((type) => (
              <div key={type.ext} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">{type.ext}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{type.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}