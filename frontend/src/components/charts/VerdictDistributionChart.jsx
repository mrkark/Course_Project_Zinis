import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6',
  CLEAN: '#22c55e',
};

export default function VerdictDistributionChart({ data, className = '', height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className={`h-${height}px flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">Нет данных</p>
      </div>
    );
  }
  
  const chartData = data.map((item) => ({
    name: item.verdict || item.range,
    value: item.count,
    color: COLORS[item.verdict || item.range] || '#6b7280',
  }));
  
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [value, 'Scans']}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            wrapperStyle={{ paddingRight: 20 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}