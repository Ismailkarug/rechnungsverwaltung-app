
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Download,
  Trash2,
  Edit
} from "lucide-react";
import { toast } from "sonner";
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CSVImportDialog } from "./csv-import-dialog";
import AsyncZIPImportDialog from "./async-zip-import-dialog";

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
  kunden: string[];
  statusValues: string[];
}

interface VerkaufsrechnungenClientProps {
  rechnungen: Rechnung[];
  filters: Filters;
}

type SortField = 'datum' | 'lieferant' | 'betragBrutto' | 'rechnungsnummer';
type SortOrder = 'asc' | 'desc';

export function VerkaufsrechnungenClient({ rechnungen, filters }: VerkaufsrechnungenClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKunde, setSelectedKunde] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [minBetrag, setMinBetrag] = useState('');
  const [maxBetrag, setMaxBetrag] = useState('');
  const [startDatum, setStartDatum] = useState('');
  const [endDatum, setEndDatum] = useState('');
  const [sortField, setSortField] = useState<SortField>('rechnungsnummer');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [asyncZIPDialogOpen, setAsyncZIPDialogOpen] = useState(false);

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
      const lieferantMatch = !selectedKunde || selectedKunde === 'all' || rechnung.lieferant === selectedKunde;

      // Statusfilter
      const statusMatch = !selectedStatus || selectedStatus === 'all' || rechnung.status === selectedStatus;

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
          // Parse as numbers for proper numerical sorting
          aVal = parseInt(a.rechnungsnummer) || 0;
          bVal = parseInt(b.rechnungsnummer) || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [rechnungen, searchTerm, selectedKunde, selectedStatus, minBetrag, maxBetrag, startDatum, endDatum, sortField, sortOrder]);

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
    setSelectedKunde('all');
    setSelectedStatus('all');
    setMinBetrag('');
    setMaxBetrag('');
    setStartDatum('');
    setEndDatum('');
  };

  const handleDownloadPdf = async (dateipfad: string) => {
    try {
      const response = await fetch(`/api/download-invoice?key=${encodeURIComponent(dateipfad)}`);
      if (!response.ok) throw new Error('Download fehlgeschlagen');
      
      const { url } = await response.json();
      
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.click();
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const exportToCsv = () => {
    const headers = [
      'Rechnungsnummer',
      'Datum',
      'Kunde', 
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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedRechnungen.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedRechnungen.map(r => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Keine Rechnungen ausgewählt');
      return;
    }

    if (!confirm(`${selectedIds.length} Rechnung(en) wirklich löschen?`)) {
      return;
    }

    setBulkUpdating(true);
    try {
      const response = await fetch('/api/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Löschen');
      }

      const data = await response.json();
      toast.success(`${data.deletedCount} Rechnung(en) gelöscht`);
      setSelectedIds([]);
      window.location.reload();
    } catch (error) {
      toast.error('Fehler beim Löschen der Rechnungen');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.length === 0) {
      toast.error('Keine Rechnungen ausgewählt');
      return;
    }

    setBulkUpdating(true);
    try {
      const response = await fetch('/api/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: selectedIds,
          updates: { status: newStatus }
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren');
      }

      const data = await response.json();
      toast.success(`${data.updatedCount} Rechnung(en) auf "${newStatus}" gesetzt`);
      setSelectedIds([]);
      window.location.reload();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Rechnungen');
    } finally {
      setBulkUpdating(false);
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                Verkaufsrechnungen
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  Einnahmen
                </Badge>
              </h1>
              <p className="text-gray-600">
                {filteredAndSortedRechnungen.length} von {rechnungen.length} Verkaufsrechnungen
                {selectedIds.length > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({selectedIds.length} ausgewählt)
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <CSVImportDialog />
              <Button 
                onClick={() => setAsyncZIPDialogOpen(true)} 
                variant="outline" 
                className="flex items-center gap-2 bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 hover:text-purple-950 font-medium"
              >
                <FileText className="h-4 w-4" />
                Große ZIP importieren (500+)
              </Button>
              <Button 
                onClick={exportToCsv} 
                className="flex items-center gap-2 bg-blue-100 text-blue-900 hover:bg-blue-200 hover:text-blue-950 font-medium border-blue-300"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                CSV Export
              </Button>
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedIds.length > 0 && (
            <Card className="bg-blue-50 border-blue-200 mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-blue-900">
                      {selectedIds.length} Rechnung(en) ausgewählt
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select onValueChange={handleBulkStatusUpdate} disabled={bulkUpdating}>
                      <SelectTrigger className="w-48 bg-white">
                        <SelectValue placeholder="Status ändern..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unbezahlt">Auf Unbezahlt setzen</SelectItem>
                        <SelectItem value="Bezahlt">Auf Bezahlt setzen</SelectItem>
                        <SelectItem value="Storniert">Auf Storniert setzen</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="destructive" 
                      onClick={handleBulkDelete}
                      disabled={bulkUpdating}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Löschen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                <Select value={selectedKunde} onValueChange={setSelectedKunde}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Kunden" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kunden</SelectItem>
                    {filters.kunden.map((lieferant) => (
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
                    <SelectItem value="all">Alle Status</SelectItem>
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
                      <th className="px-6 py-3 w-12">
                        <Checkbox
                          checked={selectedIds.length === filteredAndSortedRechnungen.length && filteredAndSortedRechnungen.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
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
                          Kunde
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
                        <td className="px-6 py-4">
                          <Checkbox
                            checked={selectedIds.includes(rechnung.id)}
                            onCheckedChange={() => toggleSelectOne(rechnung.id)}
                          />
                        </td>
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
                              onClick={() => handleDownloadPdf(rechnung.dateipfad!)}
                              className="hover:bg-blue-50"
                              title="PDF öffnen"
                            >
                              <ExternalLink className="h-4 w-4 text-blue-500" />
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

      {/* Async ZIP Import Dialog */}
      <AsyncZIPImportDialog
        open={asyncZIPDialogOpen}
        onOpenChange={setAsyncZIPDialogOpen}
        onImportComplete={() => {
          // Refresh the page to show new invoices
          window.location.reload();
        }}
      />
    </div>
  );
}
