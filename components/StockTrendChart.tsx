// components/StockTrendChart.tsx
'use client'; // This component needs to be a Client Component

import React from 'react';
import { StockHistoryPoint } from '@/types'; // Use the type
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from 'recharts';
import { format } from 'date-fns';

interface StockTrendChartProps {
  historyData: StockHistoryPoint[];
}

// Helper function to generate distinct colors (simple version)
const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#387908',
  '#00C49F',
];
const getColor = (index: number) => COLORS[index % COLORS.length];

export default function StockTrendChart({ historyData }: StockTrendChartProps) {
  if (!historyData || historyData.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic p-4 text-center">
        No historical stock data available to display chart.
      </p>
    );
  }

  // 1. Process data: Group by date and pivot by warehouse
  const warehouseDataMap = new Map<
    number,
    { name: string; data: { date: number; quantity: number }[] }
  >();
  historyData.forEach(point => {
    const whId = point.warehouse_id;
    if (!warehouseDataMap.has(whId)) {
      warehouseDataMap.set(whId, { name: point.warehouse_name, data: [] });
    }
    warehouseDataMap.get(whId)?.data.push({
      date: new Date(point.movement_date).getTime(), // Use timestamp for easier sorting/axis
      quantity: parseFloat(point.quantity_on_hand_after_movement),
    });
  });

  // Convert map to array for rendering lines
  const warehouseSeries = Array.from(warehouseDataMap.entries()).map(
    ([id, series], index) => ({
      id,
      name: series.name,
      data: series.data.sort((a, b) => a.date - b.date), // Ensure data is sorted by date for lines
      color: getColor(index),
    }),
  );

  // 2. Combine data for charting (Recharts prefers flat data for multi-line)
  // We need all unique dates across all warehouses
  const allDates = new Set<number>();
  warehouseSeries.forEach(series =>
    series.data.forEach(p => allDates.add(p.date)),
  );
  const sortedDates = Array.from(allDates).sort((a, b) => a - b);

  const chartData = sortedDates.map(date => {
    const dataPoint: { [key: string]: number | string } = {
      date: date,
      formattedDate: format(new Date(date), 'yyyy-MM-dd HH:mm'), // For display
    };
    warehouseSeries.forEach(series => {
      // Find the last known quantity for this warehouse at or before this date
      let lastQuantity: number | null = null;
      // Iterate backwards through the specific series data
      for (let i = series.data.length - 1; i >= 0; i--) {
        if (series.data[i].date <= date) {
          lastQuantity = series.data[i].quantity;
          break; // Found the relevant point
        }
      }
      // Use null if no data point found before or at this date (shouldn't happen with running total approach)
      dataPoint[`wh_${series.id}`] = lastQuantity ?? 0; // Use 0 if null for charting continuity
    });
    return dataPoint;
  });

  return (
    <div style={{ width: '100%', height: 350 }}>
      {' '}
      {/* Set height for the container */}
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            type="number" // Use number because dataKey is timestamp
            scale="time"
            domain={['dataMin', 'dataMax']} // Ensure full range is shown
            tickFormatter={unixTime =>
              format(new Date(unixTime), 'MM/dd HH:mm')
            } // Format ticks
            stroke="#666"
            fontSize={10}
            angle={-15} // Angle ticks slightly if needed
            textAnchor="end"
            height={40} // Allocate space for angled ticks
          />
          <YAxis
            stroke="#666"
            fontSize={10}
            tickFormatter={value => value.toLocaleString()} // Format large numbers
            domain={['auto', 'auto']} // Adjust domain if needed, e.g., ['dataMin - 5', 'dataMax + 5']
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid #ccc',
              fontSize: '12px',
            }}
            labelFormatter={label =>
              format(new Date(label), 'yyyy-MM-dd HH:mm:ss')
            } // Tooltip label format
            formatter={(value, name, props) => {
              // Find the original series name based on the dataKey (e.g., wh_1)
              const whId = parseInt((name as string).replace('wh_', ''), 10);
              const series = warehouseSeries.find(s => s.id === whId);
              return [
                `${Number(value).toLocaleString()}`,
                series ? series.name : name,
              ]; // Show formatted value and warehouse name
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          {warehouseSeries.map(series => (
            <Line
              key={series.id}
              type="stepAfter" // Use step chart as quantity changes instantly
              dataKey={`wh_${series.id}`} // Key used in chartData
              name={series.name} // Name shown in Legend/Tooltip
              stroke={series.color}
              strokeWidth={2}
              dot={false} // Hide dots for cleaner look, enable if needed: dot={{ r: 2 }}
              activeDot={{ r: 4 }} // Dot on hover
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
