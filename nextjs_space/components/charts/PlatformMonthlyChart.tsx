
'use client';

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MonthlyPoint } from '@/src/types/platformSummary';

interface Props {
  data: MonthlyPoint[];
}

export function PlatformMonthlyChart({ data }: Props) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="outgoingGross" stroke="#10b981" name="Verkauf (Brutto)" strokeWidth={2} />
          <Line type="monotone" dataKey="incomingGross" stroke="#ef4444" name="Ausgaben (Brutto)" strokeWidth={2} />
          <Line type="monotone" dataKey="feeTotal" stroke="#f59e0b" name="Gebühren gesamt" strokeWidth={2} />
          <Line type="monotone" dataKey="adCostTotal" stroke="#8b5cf6" name="Werbekosten" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
