import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartRecommendation } from '../../types';
import { useStore } from '../../store';

interface DataChartProps {
  data: Record<string, unknown>[];
  recommendation: ChartRecommendation;
}

const COLORS = ['#6c5ce7', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export const DataChart: React.FC<DataChartProps> = ({ data, recommendation }) => {
  const { theme } = useStore();
  const { chartType, xField, yField } = recommendation;

  if (!data || data.length === 0 || chartType === 'table') return null;

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#3a3a3a' : '#e5e2dc';
  const tickColor = isDark ? '#8e8e8e' : '#6b6b6b';
  const tooltipBg = isDark ? '#252525' : '#ffffff';

  const chartData = data.slice(0, 20).map(row => ({
    ...row,
    [xField]: row[xField] !== undefined ? row[xField] : '',
    [yField]: row[yField] !== undefined ? Number(row[yField]) : 0,
  }));

  return (
    <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div className="text-xs mb-2 flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
        <span>Chart: {chartType}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{recommendation.reason}</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        {chartType === 'bar' ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={xField} tick={{ fill: tickColor, fontSize: 11 }} />
            <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridColor}`, borderRadius: '8px', color: tickColor }} />
            <Bar dataKey={yField} fill="#6c5ce7" radius={[6, 6, 0, 0]} />
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={xField} tick={{ fill: tickColor, fontSize: 11 }} />
            <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridColor}`, borderRadius: '8px' }} />
            <Line type="monotone" dataKey={yField} stroke="#6c5ce7" strokeWidth={2} dot={{ fill: '#6c5ce7' }} />
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={chartData} dataKey={yField} nameKey={xField} cx="50%" cy="50%" outerRadius={90}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ stroke: tickColor }}>
              {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${gridColor}`, borderRadius: '8px' }} />
            <Legend wrapperStyle={{ color: tickColor, fontSize: 11 }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
