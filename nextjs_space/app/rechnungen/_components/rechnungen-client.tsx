
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { 
  Search, 
  Filter, 
  FileText,
  ExternalLink,
  ArrowUpDown,
  Calendar,
  Building2,
  Euro,
  Download
} from "lucide-react";
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Rechnung {
  id: string;
  rechnungsnummer: string;
  datum: string;
  lieferant: string;
  betragNetto: number;
  mwstSatz: string;
  mwstBetrag: number | null;
  betragBrutto: number;
  leistungszeitraum: string | null;
  dateipfad: string | null;
  status: string | null;
  verarbeitungsdatum: string | null;
}

interface Filters {
  lieferanten: string[];
  statusValues: string[];
}

interface RechnungenClientProps {
  rechnungen: Rechnung[];
  filters: Filters;
}

type SortField = 'datum' | 'lieferant' | 'betragBrutto' | 'rechnungsnummer';
type SortOrder = 'asc' | 'desc';

export function RechnungenClient({ rechnungen, filters }: RechnungenClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLieferant, setSelectedLieferant] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [minBetrag, setMinBetrag] = useState('');
  const [maxBetrag, setMaxBetrag] = useState('');
  const [startDatum, setStartDatum] = useState('');
  const [endDatum, setEndDatum] = useState('');
  const [sortField, setSortField] = useState<SortField>('datum');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  const filteredAndSortedRechnungen = useMemo(() => {
    let filtered = rechnungen.filter(rechnung => {
      // Suchfilter
      const searchMatch = !searchTerm || (
        rechnung.rechnungsnummer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rechnung.lieferant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rechnung.leistungszeitraum?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rechnung.status?.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // Lieferantenfilter
      const lieferantMatch = !selectedLieferant || rechnung.lieferant === selectedLieferant;

      // Statusfilter
      const statusMatch = !selectedStatus || rechnung.status === selectedStatus;

      // Betragsfilter
      const minBetragMatch = !minBetrag || rechnung.betragBrutto >= parseFloat(minBetrag);
      const maxBetragMatch = !maxBetrag || rechnung.betragBrutto <= parseFloat(maxBetrag);

      // Datumsfilter
      const startDatumMatch = !startDatum || new Date(rechnung.datum) >= new Date(startDatum);
      const endDatumMatch = !endDatum || new Date(rechnung.datum) <= new Date(endDatum);

      return searchMatch && lieferantMatch && statusMatch && 
             minBetragMatch && maxBetragMatch && startDatumMatch && endDatumMatch;
    });

    // Sortierung
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'datum':
          aVal = new Date(a.datum).getTime();
          bVal = new Date(b.datum).getTime();
          break;
        case 'lieferant':
          aVal = a.lieferant.toLowerCase();
          bVal = b.lieferant.toLowerCase();
          break;
        case 'betragBrutto':
          aVal = a.betragBrutto;
          bVal = b.betragBrutto;
          break;
        case 'rechnungsnummer':
          aVal = a.rechnungsnummer.toLowerCase();
          bVal = b.rechnungsnummer.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [rechnungen, searchTerm, selectedLieferant, selectedStatus, minBetrag, maxBetrag, startDatum, endDatum, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLieferant('');
    setSelectedStatus('');
    setMinBetrag('');
    setMaxBetrag('');
    setStartDatum('');
    setEndDatum('');
  };

  const exportToCsv = () => {
    const headers = [
      'Rechnungsnummer',
      'Datum',
      'Lieferant', 
      'Betrag Netto',
      'MwSt-Satz',
      'MwSt-Betrag',
      'Betrag Brutto',
      'Leistungszeitraum',
      'Status',
      'Dateipfad'
    ];

    const csvData = filteredAndSortedRechnungen.map(r => [
      r.rechnungsnummer,
      formatDate(r.datum),
      r.lieferant,
      formatCurrency(r.betragNetto),
      r.mwstSatz,
      r.mwstBetrag ? formatCurrency(r.mwstBetrag) : '',
      formatCurrency(r.betragBrutto),
      r.leistungszeitraum || '',
      r.status || '',
      r.dateipfad || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rechnungen_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                Rechnungsübersicht
              </h1>
              <p className="text-gray-600">
                {filteredAndSortedRechnungen.length} von {rechnungen.length} Rechnungen
              </p>
            </div>
            <Button onClick={exportToCsv} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV Export
            </Button>
          </div>

          {/* Filter Section */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5 text-blue-500" />
                Filter & Suche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {/* Suchfeld */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Lieferant */}
                <Select value={selectedLieferant} onValueChange={setSelectedLieferant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Lieferanten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Lieferanten</SelectItem>
                    {filters.lieferanten.map((lieferant) => (
                      <SelectItem key={lieferant} value={lieferant}>
                        {lieferant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status */}
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Status</SelectItem>
                    {filters.statusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Min Betrag */}
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="number"
                    placeholder="Min. €"
                    value={minBetrag}
                    onChange={(e) => setMinBetrag(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Max Betrag */}
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="number"
                    placeholder="Max. €"
                    value={maxBetrag}
                    onChange={(e) => setMaxBetrag(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Start Datum */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    placeholder="Von Datum"
                    value={startDatum}
                    onChange={(e) => setStartDatum(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* End Datum */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    placeholder="Bis Datum"
                    value={endDatum}
                    onChange={(e) => setEndDatum(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Clear Filters */}
                <Button variant="outline" onClick={clearFilters} className="col-start-1">
                  Filter zurücksetzen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSort('rechnungsnummer')}
                          className="flex items-center gap-1 -ml-2"
                        >
                          Rechnungsnummer
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSort('datum')}
                          className="flex items-center gap-1 -ml-2"
                        >
                          Datum
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSort('lieferant')}
                          className="flex items-center gap-1 -ml-2"
                        >
                          Lieferant
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Betrag Netto
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MwSt
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSort('betragBrutto')}
                          className="flex items-center gap-1 -mr-2 ml-auto"
                        >
                          Betrag Brutto
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PDF
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedRechnungen.map((rechnung, index) => (
                      <motion.tr
                        key={rechnung.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {rechnung.rechnungsnummer}
                          </div>
                          {rechnung.leistungszeitraum && (
                            <div className="text-sm text-gray-500">
                              {rechnung.leistungszeitraum}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(rechnung.datum)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {rechnung.lieferant}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(rechnung.betragNetto)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{rechnung.mwstSatz}</div>
                          {rechnung.mwstBetrag && (
                            <div className="text-xs text-gray-500">
                              {formatCurrency(rechnung.mwstBetrag)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(rechnung.betragBrutto)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {rechnung.status ? (
                            <Badge variant="secondary" className="text-xs">
                              {rechnung.status}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {rechnung.dateipfad ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="hover:bg-blue-50"
                            >
                              <a
                                href={rechnung.dateipfad}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="PDF öffnen"
                              >
                                <ExternalLink className="h-4 w-4 text-blue-500" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>

                {filteredAndSortedRechnungen.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Keine Rechnungen gefunden
                    </h3>
                    <p className="text-gray-500">
                      {rechnungen.length === 0 
                        ? 'Es sind noch keine Rechnungen in der Datenbank vorhanden.'
                        : 'Keine Rechnungen entsprechen den gewählten Filterkriterien.'
                      }
                    </p>
                    {rechnungen.length > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="mt-4"
                      >
                        Filter zurücksetzen
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
