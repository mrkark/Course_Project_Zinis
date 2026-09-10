import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';

export default function RiskScoreChart({ data, className = '', height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className={`h-${height}px flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">Нет данных</p>
      </div>
    );
  }
  
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            }}
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value) => [`${value}`, 'Risk Score']}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={0.1}
            fill="#ef4444"
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
          <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeDasharray="5 5" strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="medium" stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={1} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}