'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, DollarSign, Package, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface PlatformSummary {
  platform: string;
  dateRange: {
    from: string;
    to: string;
  };
  summary: {
    orderCount: number;
    grossTotal: number;
    netTotal: number;
    vatTotal: number;
    averageOrderValue: number;
    fees: {
      platformFees: number;
      paymentFees: number;
      adCosts: number;
      shippingCosts: number;
      total: number;
    };
    netProfit: number;
    profitMargin: number;
    refunds: {
      count: number;
      amount: number;
    };
  };
  breakdown: {
    outgoing: {
      count: number;
      grossTotal: number;
      netTotal: number;
      vatTotal: number;
    };
    incoming: {
      count: number;
      grossTotal: number;
      netTotal: number;
      vatTotal: number;
    };
  };
  monthlyData: Array<{
    month: string;
    grossTotal: number;
    netTotal: number;
    fees: number;
    orderCount: number;
  }>;
}

export default function AmazonFinanceClient() {
  const [data, setData] = useState<PlatformSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        platform: 'AMAZON',
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      });

      const response = await fetch(`/api/platform-summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching Amazon data:', error);
      toast.error('Fehler beim Laden der Amazon-Daten');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const csvContent = [
      ['Amazon Finance Report'],
      ['Zeitraum', `${format(new Date(data.dateRange.from), 'dd.MM.yyyy')} - ${format(new Date(data.dateRange.to), 'dd.MM.yyyy')}`],
      [''],
      ['Übersicht'],
      ['Bestellungen', data.summary.orderCount],
      ['Bruttoeinnahmen', `€${data.summary.grossTotal.toFixed(2)}`],
      ['Nettoeinnahmen', `€${data.summary.netTotal.toFixed(2)}`],
      ['MwSt', `€${data.summary.vatTotal.toFixed(2)}`],
      ['Durchschn. Bestellwert', `€${data.summary.averageOrderValue.toFixed(2)}`],
      [''],
      ['Gebühren'],
      ['Amazon Vermittlungsgebühren', `€${data.summary.fees.platformFees.toFixed(2)}`],
      ['FBA Gebühren', `€${data.summary.fees.paymentFees.toFixed(2)}`],
      ['Amazon PPC Werbekosten', `€${data.summary.fees.adCosts.toFixed(2)}`],
      ['Versandkosten', `€${data.summary.fees.shippingCosts.toFixed(2)}`],
      ['Gesamt Gebühren', `€${data.summary.fees.total.toFixed(2)}`],
      [''],
      ['Nettogewinn', `€${data.summary.netProfit.toFixed(2)}`],
      ['Gewinnmarge', `${data.summary.profitMargin.toFixed(2)}%`],
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `amazon_finance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('CSV-Export erfolgreich');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Amazon-Daten...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Keine Daten verfügbar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <svg className="h-8 w-8" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="8" fill="#FF9900"/>
                <path d="M20 28c-4 2-8 3-12 3 4 4 9 6 15 6 8 0 15-4 19-10-3 1-6 2-10 2-4 0-8-1-12-1z" fill="white"/>
                <path d="M30 24c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4z" fill="white"/>
              </svg>
            </div>
            Amazon Finance
          </h1>
          <p className="text-gray-500 mt-1">Finanzübersicht & Gebührenanalyse</p>
        </div>
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          CSV Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium mb-2 block">Zeitraum</label>
              <DateRangePicker value={dateRange!} onChange={setDateRange} />
            </div>
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-2 block">Typ</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Typen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Transaktionen</SelectItem>
                  <SelectItem value="sales">Nur Verkäufe</SelectItem>
                  <SelectItem value="refunds">Nur Rückerstattungen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bruttoeinnahmen</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{data.summary.grossTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.orderCount} Bestellungen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Gebühren</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{data.summary.fees.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {((data.summary.fees.total / data.summary.grossTotal) * 100).toFixed(1)}% vom Umsatz
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nettogewinn</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{data.summary.netProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.profitMargin.toFixed(1)}% Gewinnmarge
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Bestellwert</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{data.summary.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Pro Bestellung
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Amazon Gebührenaufschlüsselung</CardTitle>
          <CardDescription>Detaillierte Übersicht aller Gebühren</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Amazon Vermittlungsgebühren</p>
                <p className="text-sm text-gray-500">Ca. 8-15% je nach Kategorie</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">€{data.summary.fees.platformFees.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  {data.summary.grossTotal > 0 ? ((data.summary.fees.platformFees / data.summary.grossTotal) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">FBA-Gebühren</p>
                <p className="text-sm text-gray-500">Fulfillment by Amazon</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">€{data.summary.fees.paymentFees.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  {data.summary.grossTotal > 0 ? ((data.summary.fees.paymentFees / data.summary.grossTotal) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Amazon PPC Werbekosten</p>
                <p className="text-sm text-gray-500">Sponsored Products / Brands</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">€{data.summary.fees.adCosts.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  {data.summary.grossTotal > 0 ? ((data.summary.fees.adCosts / data.summary.grossTotal) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Versandkosten</p>
                <p className="text-sm text-gray-500">Nicht FBA-Versandgebühren</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">€{data.summary.fees.shippingCosts.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  {data.summary.grossTotal > 0 ? ((data.summary.fees.shippingCosts / data.summary.grossTotal) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-bold text-lg">Gesamte Gebühren</p>
                  <p className="text-sm text-gray-600">Alle Gebühren zusammen</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">€{data.summary.fees.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {data.summary.grossTotal > 0 ? ((data.summary.fees.total / data.summary.grossTotal) * 100).toFixed(1) : 0}% vom Umsatz
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monatlicher Umsatz vs. Gebühren</CardTitle>
          <CardDescription>Verlauf über den gewählten Zeitraum</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `€${value.toFixed(2)}`}
                labelFormatter={(label) => `Monat: ${label}`}
              />
              <Legend />
              <Bar dataKey="grossTotal" name="Bruttoeinnahmen" fill="#10b981" />
              <Bar dataKey="fees" name="Gebühren" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Net Profit Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Nettogewinn-Entwicklung</CardTitle>
          <CardDescription>Monatliche Gewinnentwicklung</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthlyData.map(m => ({
              ...m,
              netProfit: m.grossTotal - m.fees
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `€${value.toFixed(2)}`}
                labelFormatter={(label) => `Monat: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="netProfit" 
                name="Nettogewinn" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
