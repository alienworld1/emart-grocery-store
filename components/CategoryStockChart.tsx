'use client';

import React from 'react';
import { CategoryStockInfo } from '@/types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

interface CategoryStockChartProps {
  data: CategoryStockInfo[];
}

// Simple color generator
const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
];

const RADIAN = Math.PI / 180;
// Custom label renderer for Pie chart segments
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index,
  name,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5; // Position label inside segment
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only render label if percent is large enough to avoid clutter
  if (percent * 100 < 5) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={10}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
      {/* Optional: Add name if space permits */}
      {/* {` ${name} ${(percent * 100).toFixed(0)}%`} */}
    </text>
  );
};

export default function CategoryStockChart({ data }: CategoryStockChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic p-4 text-center">
        No stock data by category available.
      </p>
    );
  }

  // Prepare data for Recharts Pie - needs 'name' and 'value' keys
  const chartData = data.map(item => ({
    name: item.category_name,
    value: parseFloat(item.total_quantity),
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80} // Adjust size as needed
            fill="#8884d8"
            dataKey="value"
            nameKey="name" // Use category_name for tooltip/legend
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()} units`,
              name,
            ]} // Format tooltip
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            layout="vertical"
            align="right"
            verticalAlign="middle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
