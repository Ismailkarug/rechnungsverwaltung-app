
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
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  Users
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface KPISubData {
  totalRechnungen: number;
  gesamtsummeBrutto: number;
  gesamtsummeNetto: number;
  gesamtsummeMwst: number;
  durchschnitt: number;
  lieferantenCount?: number;
  kundenCount?: number;
}

interface KPIData {
  eingang: KPISubData;
  ausgang: KPISubData;
}

interface ChartDataItem {
  datum: string;
  betragBrutto: number;
  betragNetto: number;
  lieferant: string;
  mwstBetrag: number;
  typ: string;
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
  typ: string;
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
  // Trenne Daten nach Typ
  const eingangData = chartData.filter(item => item.typ === 'Eingang');
  const ausgangData = chartData.filter(item => item.typ === 'Ausgang');

  // Bereite Monatsdaten vor (beide Typen)
  const monthlyData = chartData.reduce((acc: any[], item) => {
    const monthYear = new Date(item.datum).toLocaleDateString('de-DE', { 
      month: 'short', 
      year: '2-digit' 
    });
    
    const existing = acc.find(d => d.monat === monthYear);
    if (existing) {
      if (item.typ === 'Eingang') {
        existing.eingang = (existing.eingang || 0) + item.betragBrutto;
      } else {
        existing.ausgang = (existing.ausgang || 0) + item.betragBrutto;
      }
    } else {
      acc.push({
        monat: monthYear,
        eingang: item.typ === 'Eingang' ? item.betragBrutto : 0,
        ausgang: item.typ === 'Ausgang' ? item.betragBrutto : 0
      });
    }
    
    return acc;
  }, []).sort((a, b) => a.monat.localeCompare(b.monat));

  // Bereite Lieferanten-Daten vor (nur Eingang)
  const lieferantenData = eingangData.reduce((acc: any[], item) => {
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
  }, []).sort((a, b) => b.betrag - a.betrag).slice(0, 8);

  // Bereite Kunden-Daten vor (nur Ausgang)
  const kundenData = ausgangData.reduce((acc: any[], item) => {
    const existing = acc.find(d => d.kunde === item.lieferant);
    if (existing) {
      existing.betrag += item.betragBrutto;
    } else {
      acc.push({
        kunde: item.lieferant,
        betrag: item.betragBrutto
      });
    }
    return acc;
  }, []).sort((a, b) => b.betrag - a.betrag).slice(0, 8);

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

  const handleDownloadPdf = async (dateipfad: string) => {
    try {
      const response = await fetch(`/api/download-invoice?key=${encodeURIComponent(dateipfad)}`);
      
      if (!response.ok) {
        throw new Error('Download fehlgeschlagen');
      }

      const data = await response.json();
      
      // Öffne die signierte URL in neuem Tab
      const link = document.createElement('a');
      link.href = data.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Fehler beim Öffnen der Rechnung');
    }
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

          {/* KPI Cards - Separated by Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Eingangsrechnungen (Ausgaben) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-orange-900 flex items-center gap-2">
                      <ArrowDownCircle className="h-6 w-6 text-orange-600" />
                      Eingangsrechnungen (Ausgaben)
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-orange-700">Anzahl Rechnungen</p>
                      <p className="text-2xl font-bold text-orange-900">
                        <CountUp end={kpiData.eingang.totalRechnungen} />
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-orange-700">Lieferanten</p>
                      <p className="text-2xl font-bold text-orange-900">
                        <CountUp end={kpiData.eingang.lieferantenCount || 0} />
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-3 border-t border-orange-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700">Brutto gesamt:</span>
                      <span className="text-lg font-bold text-orange-900">{formatCurrency(kpiData.eingang.gesamtsummeBrutto)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700">Netto gesamt:</span>
                      <span className="text-lg font-semibold text-orange-800">{formatCurrency(kpiData.eingang.gesamtsummeNetto)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700">MwSt gesamt:</span>
                      <span className="text-lg font-semibold text-orange-800">{formatCurrency(kpiData.eingang.gesamtsummeMwst)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                      <span className="text-sm font-medium text-orange-700">Durchschnitt/Rechnung:</span>
                      <span className="text-md font-bold text-orange-900">{formatCurrency(kpiData.eingang.durchschnitt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Ausgangsrechnungen (Umsätze) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-green-900 flex items-center gap-2">
                      <ArrowUpCircle className="h-6 w-6 text-green-600" />
                      Ausgangsrechnungen (Umsätze)
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-700">Anzahl Rechnungen</p>
                      <p className="text-2xl font-bold text-green-900">
                        <CountUp end={kpiData.ausgang.totalRechnungen} />
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-700">Kunden</p>
                      <p className="text-2xl font-bold text-green-900">
                        <CountUp end={kpiData.ausgang.kundenCount || 0} />
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-3 border-t border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">Brutto gesamt:</span>
                      <span className="text-lg font-bold text-green-900">{formatCurrency(kpiData.ausgang.gesamtsummeBrutto)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">Netto gesamt:</span>
                      <span className="text-lg font-semibold text-green-800">{formatCurrency(kpiData.ausgang.gesamtsummeNetto)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">MwSt gesamt:</span>
                      <span className="text-lg font-semibold text-green-800">{formatCurrency(kpiData.ausgang.gesamtsummeMwst)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                      <span className="text-sm font-medium text-green-700">Durchschnitt/Rechnung:</span>
                      <span className="text-md font-bold text-green-900">{formatCurrency(kpiData.ausgang.durchschnitt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Line Chart - Eingang vs Ausgang */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      Rechnungen nach Monat
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Eingang (Ausgaben) vs. Ausgang (Umsätze)
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
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
                        formatter={(value: number, name: string) => {
                          const label = name === 'eingang' ? 'Eingangsrechnungen' : 'Ausgangsrechnungen';
                          return [formatCurrency(value), label];
                        }}
                        labelFormatter={(label) => `Monat: ${label}`}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Legend 
                        formatter={(value) => value === 'eingang' ? 'Eingangsrechnungen (Ausgaben)' : 'Ausgangsrechnungen (Umsätze)'}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="eingang" 
                        stroke="#FF9149"
                        strokeWidth={3}
                        dot={{ fill: '#FF9149', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="eingang"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ausgang" 
                        stroke="#72BF78"
                        strokeWidth={3}
                        dot={{ fill: '#72BF78', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="ausgang"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Supplier Pie Chart (Eingang only) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-orange-500" />
                      Lieferanten-Verteilung
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Ausgaben pro Lieferant (nur Eingangsrechnungen)
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
                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                    {lieferantenData.map((item, index) => (
                      <div key={item.lieferant} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-600 truncate max-w-[200px]">
                            {item.lieferant}
                          </span>
                        </div>
                        <span className="text-sm font-medium flex-shrink-0 ml-2">
                          {formatCurrency(item.betrag)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Second Charts Row - Customer Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Customer Pie Chart (Ausgang only) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-500" />
                      Kunden-Verteilung
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Umsätze pro Kunde (nur Ausgangsrechnungen)
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={kundenData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="betrag"
                      >
                        {kundenData.map((entry, index) => (
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
                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                    {kundenData.map((item, index) => (
                      <div key={item.kunde} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-600 truncate max-w-[200px]">
                            {item.kunde}
                          </span>
                        </div>
                        <span className="text-sm font-medium flex-shrink-0 ml-2">
                          {formatCurrency(item.betrag)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Latest Invoices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
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
                          {rechnung.typ === 'Ausgang' ? (
                            <ArrowUpCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-orange-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {rechnung.rechnungsnummer}
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                rechnung.typ === 'Ausgang' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {rechnung.typ === 'Ausgang' ? 'Umsatz' : 'Ausgabe'}
                            </Badge>
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
                            onClick={() => handleDownloadPdf(rechnung.dateipfad!)}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
