import { useEffect } from 'react';
import useThreatStore from '../store/threatStore';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const SEVERITY_ICONS = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🔵',
};

export default function ThreatLibrary() {
  const { threats, fetchThreats, loading } = useThreatStore();

  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Библиотека угроз</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Reference database of malware types, characteristics, and detection signatures
        </p>
      </div>

      {loading ? (
        <Card className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Загрузка библиотеки угроз...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {threats.map((threat) => (
            <Card key={threat.type} className="overflow-hidden transition-shadow hover:shadow-lg">
              <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${
                threat.severity === 'CRITICAL' ? 'bg-danger-50 dark:bg-danger-900/20' :
                threat.severity === 'HIGH' ? 'bg-warning-50 dark:bg-warning-900/20' :
                threat.severity === 'MEDIUM' ? 'bg-warning-50 dark:bg-warning-900/20' :
                'bg-gray-50 dark:bg-gray-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{threat.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{threat.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={threat.severity.toLowerCase()}>{threat.severity}</Badge>
                    <span className="text-2xl">{SEVERITY_ICONS[threat.severity] || '📌'}</span>
                  </div>
                </div>
              </div>
              
              <Card.Content className="p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Описание</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{threat.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Характеристики</h4>
                  <div className="flex flex-wrap gap-2">
                    {(threat.characteristics || []).map((char, i) => (
                      <Badge key={i} variant="info" className="text-xs">{char}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Весовые коэффициенты</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(threat.scoreWeights || {}).map(([key, value]) => (
                      <div key={key} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-gray-500 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-gray-900 dark:text-white ml-2">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
