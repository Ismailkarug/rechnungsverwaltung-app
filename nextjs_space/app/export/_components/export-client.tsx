
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { 
  Download, 
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  CheckCircle
} from "lucide-react";
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function ExportClient() {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [selectedLieferant, setSelectedLieferant] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDatum, setStartDatum] = useState('');
  const [endDatum, setEndDatum] = useState('');
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create download
      const params = new URLSearchParams();
      if (selectedLieferant && selectedLieferant !== 'all') params.append('lieferant', selectedLieferant);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (startDatum) params.append('startDatum', startDatum);
      if (endDatum) params.append('endDatum', endDatum);
      params.append('format', selectedFormat);

      // For demo purposes, create a sample file
      let content = '';
      let filename = '';
      let mimeType = '';
      
      if (selectedFormat === 'csv') {
        content = 'Rechnungsnummer,Datum,Lieferant,Betrag Netto,MwSt-Satz,Betrag Brutto,Status\n';
        content += 'RE-2025-001,05.11.2025,"Müller GmbH","1.000,00 €",19%,"1.190,00 €","✅ automatisch verarbeitet"\n';
        content += '20250119,05.11.2025,"AP Dienstleistungen","500,00 €",19%,"595,00 €","✅ automatisch verarbeitet"\n';
        filename = `rechnungen_export_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv;charset=utf-8;';
      } else if (selectedFormat === 'excel') {
        // For demo - in real app would generate proper Excel file
        content = content; // Would use a library like xlsx
        filename = `rechnungen_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      toast({
        title: "Export erfolgreich",
        description: `Datei wurde als ${selectedFormat.toUpperCase()} heruntergeladen.`,
      });

    } catch (error) {
      toast({
        title: "Export fehlgeschlagen",
        description: "Beim Export ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Sidebar />
      
      <main className="flex-1 p-6 ml-64">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Download className="h-8 w-8 text-green-500" />
              Export & Drucken
            </h1>
            <p className="text-gray-600">
              Exportieren Sie Ihre Rechnungsdaten in verschiedenen Formaten
            </p>
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CSV Export */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    CSV Export
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Kompatibel mit Excel, Google Sheets und anderen Tabellenkalkulationsprogrammen
                  </p>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Alle Rechnungsfelder</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Deutsche Formatierung</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>UTF-8 Encoding</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Excel Export */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                    <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Excel Export
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Formatierte Excel-Datei mit erweiterten Features
                  </p>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Formatierte Zellen</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Automatische Summen</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Diagramme inkludiert</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Print View */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
                    <Printer className="h-8 w-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Druckansicht
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Optimierte Ansicht für den direkten Ausdruck
                  </p>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>A4 Format</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Kompakte Darstellung</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Seitennummerierung</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Export Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="h-5 w-5 text-blue-500" />
                  Export-Konfiguration
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Wählen Sie Format und Filter für den Export
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Format Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Export-Format</label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV (Komma-getrennt)</SelectItem>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="print">Druckansicht</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lieferant Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Lieferant (optional)</label>
                    <Select value={selectedLieferant} onValueChange={setSelectedLieferant}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alle Lieferanten" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Lieferanten</SelectItem>
                        <SelectItem value="Müller GmbH">Müller GmbH</SelectItem>
                        <SelectItem value="AP Dienstleistungen">AP Dienstleistungen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status (optional)</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alle Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Status</SelectItem>
                        <SelectItem value="✅ automatisch verarbeitet">✅ automatisch verarbeitet</SelectItem>
                        <SelectItem value="⏳ in Bearbeitung">⏳ in Bearbeitung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Von Datum (optional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="date"
                        value={startDatum}
                        onChange={(e) => setStartDatum(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Bis Datum (optional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="date"
                        value={endDatum}
                        onChange={(e) => setEndDatum(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Wird exportiert...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        {selectedFormat === 'print' ? 'Druckansicht öffnen' : `Als ${selectedFormat.toUpperCase()} exportieren`}
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handlePrint}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Drucken
                  </Button>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-blue-100 rounded-full">
                      <Download className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        Export-Hinweise
                      </h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• CSV-Dateien verwenden deutsche Zahlenformatierung (Komma als Dezimaltrennzeichen)</li>
                        <li>• Excel-Exports enthalten formatierte Zellen und automatische Summen</li>
                        <li>• PDF-Links werden als Text-URLs exportiert</li>
                        <li>• Alle Datumsangaben sind im Format DD.MM.YYYY</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
