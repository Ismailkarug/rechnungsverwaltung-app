
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { 
  FileText, 
  Euro, 
  Calculator, 
  Building2,
  ExternalLink,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

interface KPIData {
  totalRechnungen: number;
  gesamtsumme: number;
  durchschnitt: number;
  lieferantenCount: number;
}

interface ChartDataItem {
  datum: string;
  betragBrutto: number;
  lieferant: string;
  mwstBetrag: number;
}

interface Rechnung {
  id: string;
  rechnungsnummer: string;
  datum: string;
  lieferant: string;
  betragNetto: number;
  betragBrutto: number;
  mwstBetrag: number | null;
  status: string | null;
  dateipfad: string | null;
}

interface DashboardClientProps {
  kpiData: KPIData;
  chartData: ChartDataItem[];
  letzteRechnungen: Rechnung[];
}

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#FF6363', '#80D8C3', '#A19AD3', '#72BF78'];

function CountUp({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  useEffect(() => {
    if (inView) {
      let startTime: number;
      let animationFrame: number;

      const animate = (currentTime: number) => {
        if (startTime === undefined) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        setCount(Math.floor(progress * end));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [inView, end, duration]);

  return <span ref={ref}>{count.toLocaleString('de-DE')}</span>;
}

export function DashboardClient({ kpiData, chartData, letzteRechnungen }: DashboardClientProps) {
  // Bereite Monatsdaten vor
  const monthlyData = chartData.reduce((acc: any[], item) => {
    const monthYear = new Date(item.datum).toLocaleDateString('de-DE', { 
      month: 'short', 
      year: '2-digit' 
    });
    
    const existing = acc.find(d => d.monat === monthYear);
    if (existing) {
      existing.betrag += item.betragBrutto;
      existing.anzahl += 1;
    } else {
      acc.push({
        monat: monthYear,
        betrag: item.betragBrutto,
        anzahl: 1
      });
    }
    
    return acc;
  }, []);

  // Bereite Lieferanten-Daten vor
  const lieferantenData = chartData.reduce((acc: any[], item) => {
    const existing = acc.find(d => d.lieferant === item.lieferant);
    if (existing) {
      existing.betrag += item.betragBrutto;
    } else {
      acc.push({
        lieferant: item.lieferant,
        betrag: item.betragBrutto
      });
    }
    return acc;
  }, []).sort((a, b) => b.betrag - a.betrag);

  // MwSt-Übersicht
  const mwstData = [
    {
      name: 'Nettobetrag',
      betrag: chartData.reduce((sum, item) => sum + (item.betragBrutto - item.mwstBetrag), 0)
    },
    {
      name: 'Mehrwertsteuer',
      betrag: chartData.reduce((sum, item) => sum + item.mwstBetrag, 0)
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Sidebar />
      
      <main className="flex-1 p-6 ml-64">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto space-y-6"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 Dashboard
            </h1>
            <p className="text-gray-600">
              Willkommen zur Rechnungsverwaltung - Hier finden Sie alle wichtigen Kennzahlen im Überblick
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Rechnungen gesamt
                  </CardTitle>
                  <FileText className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    <CountUp end={kpiData.totalRechnungen} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Einträge in der Datenbank
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Gesamtsumme
                  </CardTitle>
                  <Euro className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(kpiData.gesamtsumme)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Bruttobetrag aller Rechnungen
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Durchschnitt
                  </CardTitle>
                  <Calculator className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(kpiData.durchschnitt)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Pro Rechnung
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Lieferanten
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    <CountUp end={kpiData.lieferantenCount} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Verschiedene Lieferanten
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Bar Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      Rechnungen nach Monat
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Entwicklung der Rechnungsbeträge
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <XAxis 
                        dataKey="monat"
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `${(value/1000).toFixed(0)}k €`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Betrag']}
                        labelFormatter={(label) => `Monat: ${label}`}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Bar 
                        dataKey="betrag" 
                        fill="#60B5FF"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Supplier Pie Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Verteilung nach Lieferanten
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Ausgaben pro Lieferant
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={lieferantenData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="betrag"
                      >
                        {lieferantenData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Betrag']}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {lieferantenData.map((item, index) => (
                      <div key={item.lieferant} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-600 truncate max-w-[150px]">
                            {item.lieferant}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency(item.betrag)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* MwSt Overview and Latest Invoices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MwSt Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    MwSt-Übersicht
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mwstData.map((item, index) => (
                      <div key={item.name} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: COLORS[index] }}
                          />
                          <span className="text-sm text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-medium">
                          {formatCurrency(item.betrag)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">Gesamt brutto</span>
                        <span className="font-bold">
                          {formatCurrency(mwstData.reduce((sum, item) => sum + item.betrag, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Latest Invoices */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="lg:col-span-2"
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Neueste Rechnungen
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Die letzten 5 bearbeiteten Rechnungen
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/rechnungen">Alle anzeigen</a>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {letzteRechnungen.map((rechnung) => (
                      <div 
                        key={rechnung.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {rechnung.rechnungsnummer}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{rechnung.lieferant}</span>
                              <span>•</span>
                              <span>{formatDate(rechnung.datum)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(rechnung.betragBrutto)}
                            </div>
                            {rechnung.status && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {rechnung.status}
                              </Badge>
                            )}
                          </div>
                          {rechnung.dateipfad && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              asChild
                            >
                              <a 
                                href={rechnung.dateipfad} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
