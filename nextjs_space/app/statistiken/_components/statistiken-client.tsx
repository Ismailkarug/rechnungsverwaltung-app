
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { 
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Euro,
  Building2,
  Activity
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatisticDataItem {
  datum: Date;
  betragBrutto: number;
  betragNetto: number;
  mwstBetrag: number;
  lieferant: string;
  mwstSatz: string;
  typ: string;
  monat: string;
  monatKurz: string;
  quartal: string;
  jahr: string;
}

interface StatistikenClientProps {
  data: StatisticDataItem[];
}

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#FF6363', '#80D8C3', '#A19AD3', '#72BF78'];

export function StatistikenClient({ data }: StatistikenClientProps) {
  const [zeitraum, setZeitraum] = useState('monat');
  const [selectedYear, setSelectedYear] = useState('alle');
  const [selectedTyp, setSelectedTyp] = useState('alle');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  // Filter data by selected year and type
  const filteredData = useMemo(() => {
    let filtered = data;
    if (selectedYear !== 'alle') {
      filtered = filtered.filter(item => item.jahr === selectedYear);
    }
    if (selectedTyp !== 'alle') {
      filtered = filtered.filter(item => item.typ === selectedTyp);
    }
    return filtered;
  }, [data, selectedYear, selectedTyp]);

  // Available years
  const availableYears = useMemo(() => {
    const years = [...new Set(data.map(item => item.jahr))];
    return years.sort().reverse();
  }, [data]);

  // Ausgaben pro Zeitraum
  const ausgabenProZeitraum = useMemo(() => {
    const groupBy = zeitraum === 'monat' ? 'monatKurz' : 
                   zeitraum === 'quartal' ? 'quartal' : 'jahr';
    
    const grouped = filteredData.reduce((acc: any, item) => {
      const key = item[groupBy as keyof StatisticDataItem] as string;
      if (!acc[key]) {
        acc[key] = { 
          periode: key, 
          betrag: 0, 
          anzahl: 0,
          netto: 0,
          mwst: 0
        };
      }
      acc[key].betrag += item.betragBrutto;
      acc[key].netto += item.betragNetto;
      acc[key].mwst += item.mwstBetrag;
      acc[key].anzahl += 1;
      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) => a.periode.localeCompare(b.periode));
  }, [filteredData, zeitraum]);

  // Top 5 Lieferanten
  const topLieferanten = useMemo(() => {
    const lieferantSums = filteredData.reduce((acc: any, item) => {
      if (!acc[item.lieferant]) {
        acc[item.lieferant] = { 
          lieferant: item.lieferant, 
          betrag: 0, 
          anzahl: 0,
          durchschnitt: 0
        };
      }
      acc[item.lieferant].betrag += item.betragBrutto;
      acc[item.lieferant].anzahl += 1;
      return acc;
    }, {});

    return Object.values(lieferantSums)
      .map((item: any) => ({
        ...item,
        durchschnitt: item.betrag / item.anzahl
      }))
      .sort((a: any, b: any) => b.betrag - a.betrag)
      .slice(0, 5);
  }, [filteredData]);

  // MwSt-Aufschlüsselung
  const mwstAufschluesslung = useMemo(() => {
    const mwstGroups = filteredData.reduce((acc: any, item) => {
      if (!acc[item.mwstSatz]) {
        acc[item.mwstSatz] = { 
          satz: item.mwstSatz, 
          betrag: 0, 
          anzahl: 0,
          mwstSumme: 0
        };
      }
      acc[item.mwstSatz].betrag += item.betragBrutto;
      acc[item.mwstSatz].mwstSumme += item.mwstBetrag;
      acc[item.mwstSatz].anzahl += 1;
      return acc;
    }, {});

    return Object.values(mwstGroups);
  }, [filteredData]);

  // Durchschnittliche Rechnungshöhe pro Lieferant
  const durchschnittProLieferant = useMemo(() => {
    return topLieferanten.map(item => ({
      lieferant: item.lieferant,
      durchschnitt: item.durchschnitt,
      anzahl: item.anzahl
    }));
  }, [topLieferanten]);

  // Statistiken
  const gesamtStatistiken = useMemo(() => {
    const gesamt = filteredData.reduce((acc, item) => {
      acc.gesamtBrutto += item.betragBrutto;
      acc.gesamtNetto += item.betragNetto;
      acc.gesamtMwst += item.mwstBetrag;
      return acc;
    }, { gesamtBrutto: 0, gesamtNetto: 0, gesamtMwst: 0 });

    return {
      ...gesamt,
      anzahlRechnungen: filteredData.length,
      durchschnittlicheRechnungshoehe: gesamt.gesamtBrutto / filteredData.length || 0,
      anzahlLieferanten: new Set(filteredData.map(item => item.lieferant)).size
    };
  }, [filteredData]);

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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                Statistiken & Auswertungen
              </h1>
              <p className="text-gray-600">
                Detaillierte Analyse Ihrer Rechnungsdaten
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedTyp} onValueChange={setSelectedTyp}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Rechnungstyp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Rechnungen</SelectItem>
                  <SelectItem value="Eingang">Eingangsrechnungen</SelectItem>
                  <SelectItem value="Ausgang">Ausgangsrechnungen</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Jahr" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Jahre</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={zeitraum} onValueChange={setZeitraum}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Zeitraum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monat">Monatlich</SelectItem>
                  <SelectItem value="quartal">Quartalsweise</SelectItem>
                  <SelectItem value="jahr">Jährlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {selectedTyp === 'Eingang' ? 'Gesamtausgaben' : 
                     selectedTyp === 'Ausgang' ? 'Gesamtumsatz' : 
                     'Gesamtbetrag'}
                  </CardTitle>
                  <Euro className={`h-4 w-4 ${
                    selectedTyp === 'Eingang' ? 'text-orange-500' :
                    selectedTyp === 'Ausgang' ? 'text-green-500' :
                    'text-blue-500'
                  }`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(gesamtStatistiken.gesamtBrutto)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedTyp === 'Eingang' ? 'Eingangsrechnungen' :
                     selectedTyp === 'Ausgang' ? 'Ausgangsrechnungen' :
                     'Alle Rechnungen'} • {selectedYear === 'alle' ? 'Alle Jahre' : `Jahr ${selectedYear}`}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Durchschnitt/Rechnung
                  </CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(gesamtStatistiken.durchschnittlicheRechnungshoehe)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {gesamtStatistiken.anzahlRechnungen} Rechnungen
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    MwSt gesamt
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(gesamtStatistiken.gesamtMwst)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {gesamtStatistiken.gesamtNetto > 0 
                      ? `${((gesamtStatistiken.gesamtMwst / gesamtStatistiken.gesamtNetto) * 100).toFixed(1)}% MwSt-Satz (durchschnittlich)`
                      : 'Keine Daten verfügbar'
                    }
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Aktive Lieferanten
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {gesamtStatistiken.anzahlLieferanten}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Verschiedene Lieferanten
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Ausgaben pro Zeitraum */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    {selectedTyp === 'Ausgang' ? 'Umsätze' : selectedTyp === 'Eingang' ? 'Ausgaben' : 'Rechnungen'} pro {zeitraum === 'monat' ? 'Monat' : zeitraum === 'quartal' ? 'Quartal' : 'Jahr'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={ausgabenProZeitraum}>
                      <XAxis 
                        dataKey="periode"
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
                          if (name === 'betrag') return [formatCurrency(value), 'Betrag brutto'];
                          if (name === 'netto') return [formatCurrency(value), 'Betrag netto'];
                          if (name === 'mwst') return [formatCurrency(value), 'MwSt'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Zeitraum: ${label}`}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="betrag" 
                        stroke="#60B5FF"
                        strokeWidth={3}
                        dot={{ fill: '#60B5FF', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#60B5FF', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="netto" 
                        stroke="#FF9149"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#FF9149', strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top 5 Lieferanten */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className={`h-5 w-5 ${
                      selectedTyp === 'Ausgang' ? 'text-green-500' : 'text-orange-500'
                    }`} />
                    {selectedTyp === 'Ausgang' ? 'Top 5 Kunden' : 'Top 5 Lieferanten'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={topLieferanten} layout="horizontal">
                      <XAxis 
                        type="number"
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `${(value/1000).toFixed(0)}k €`}
                      />
                      <YAxis 
                        type="category"
                        dataKey="lieferant"
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        width={100}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'betrag') return [formatCurrency(value), 'Gesamtumsatz'];
                          if (name === 'durchschnitt') return [formatCurrency(value), 'Durchschnitt'];
                          return [value, name];
                        }}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Bar 
                        dataKey="betrag" 
                        fill="#FF9149"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MwSt-Aufschlüsselung */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-500" />
                    MwSt-Aufschlüsselung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={mwstAufschluesslung}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="betrag"
                      >
                        {mwstAufschluesslung.map((entry, index) => (
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
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {mwstAufschluesslung.map((item: any, index: number) => (
                      <div key={item.satz} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-600">
                            MwSt {item.satz}
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

            {/* Durchschnitt pro Lieferant */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className={`h-5 w-5 ${
                      selectedTyp === 'Ausgang' ? 'text-green-500' : 'text-orange-500'
                    }`} />
                    Durchschnitt pro {selectedTyp === 'Ausgang' ? 'Kunde' : 'Lieferant'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {durchschnittProLieferant.map((item, index) => (
                      <div 
                        key={item.lieferant}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.lieferant}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.anzahl} Rechnungen
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(item.durchschnitt)}
                          </div>
                          <div className="text-sm text-gray-500">
                            ⌀ pro Rechnung
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {durchschnittProLieferant.length === 0 && (
                    <div className="text-center py-8">
                      <Building2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">
                        Keine Daten verfügbar
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
