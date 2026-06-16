import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartRecommendation } from '../../types';

interface DataChartProps {
  data: Record<string, unknown>[];
  recommendation: ChartRecommendation;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export const DataChart: React.FC<DataChartProps> = ({ data, recommendation }) => {
  const { chartType, xField, yField } = recommendation;

  if (!data || data.length === 0 || chartType === 'table') return null;

  const chartData = data.slice(0, 20).map(row => ({
    ...row,
    [xField]: row[xField] !== undefined ? row[xField] : '',
    [yField]: row[yField] !== undefined ? Number(row[yField]) : 0,
  }));

  return (
    <div className="my-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
        <span>Chart: {chartType}</span>
        <span className="text-slate-600">{recommendation.reason}</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        {chartType === 'bar' ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xField} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f8fafc' }}
            />
            <Bar dataKey={yField} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xField} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#f8fafc' }}
            />
            <Line type="monotone" dataKey={yField} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={chartData}
              dataKey={yField}
              nameKey={xField}
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ stroke: '#64748b' }}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
