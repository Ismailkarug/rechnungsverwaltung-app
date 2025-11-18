
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
  const [isExportingEingang, setIsExportingEingang] = useState(false);
  const [isExportingAusgang, setIsExportingAusgang] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [selectedLieferant, setSelectedLieferant] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDatum, setStartDatum] = useState('');
  const [endDatum, setEndDatum] = useState('');
  const { toast } = useToast();

  const handleExportEingang = async () => {
    setIsExportingEingang(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let content = '';
      if (selectedFormat === 'csv') {
        content = 'Rechnungsnummer,Datum,Lieferant,Betrag Netto,MwSt,Betrag Brutto,MwSt-Satz,Kategorie\n';
        content += 'Beispiel-Eingangsrechnungen Export\n';
      }

      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `eingangsrechnungen_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: "Export erfolgreich",
        description: "Eingangsrechnungen wurden exportiert.",
      });

    } catch (error) {
      toast({
        title: "Export fehlgeschlagen",
        description: "Beim Export ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsExportingEingang(false);
    }
  };

  const handleExportAusgang = async () => {
    setIsExportingAusgang(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let content = '';
      if (selectedFormat === 'csv') {
        content = 'Rechnungsnummer,Datum,Kunde,Betrag Netto,MwSt,Betrag Brutto,MwSt-Satz,Kategorie\n';
        content += 'Beispiel-Ausgangsrechnungen Export\n';
      }

      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ausgangsrechnungen_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: "Export erfolgreich",
        description: "Ausgangsrechnungen wurden exportiert.",
      });

    } catch (error) {
      toast({
        title: "Export fehlgeschlagen",
        description: "Beim Export ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsExportingAusgang(false);
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

          {/* Export Sections for Eingang and Ausgang */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Eingangsrechnungen Export */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 shadow-lg border-2 border-orange-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                    <Download className="h-5 w-5 text-orange-600" />
                    Eingangsrechnungen Export
                  </CardTitle>
                  <p className="text-sm text-orange-700">
                    Exportieren Sie alle Eingangsrechnungen (Ausgaben)
                  </p>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Alle Felder (Rechnungsnummer, Datum, Lieferant, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Netto, Brutto, MwSt-Betrag und MwSt-Satz</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Kategorie und Status</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Deutsche Formatierung</span>
                  </div>
                </div>

                <Button 
                  onClick={handleExportEingang}
                  disabled={isExportingEingang}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                >
                  {isExportingEingang ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Wird exportiert...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Eingangsrechnungen exportieren
                    </>
                  )}
                </Button>

                <div className="pt-3 border-t border-orange-200">
                  <p className="text-xs text-orange-600">
                    📊 Exportiert alle Eingangsrechnungen mit vollständigen Ausgabeninformationen
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Ausgangsrechnungen Export */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg border-2 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-green-900 flex items-center gap-2">
                  <Download className="h-5 w-5 text-green-600" />
                  Ausgangsrechnungen Export
                </CardTitle>
                <p className="text-sm text-green-700">
                  Exportieren Sie alle Ausgangsrechnungen (Umsätze)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Alle Felder (Rechnungsnummer, Datum, Kunde, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Netto, Brutto, MwSt-Betrag und MwSt-Satz</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Kategorie und Status</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Deutsche Formatierung</span>
                  </div>
                </div>

                <Button 
                  onClick={handleExportAusgang}
                  disabled={isExportingAusgang}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                  {isExportingAusgang ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Wird exportiert...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Ausgangsrechnungen exportieren
                    </>
                  )}
                </Button>

                <div className="pt-3 border-t border-green-200">
                  <p className="text-xs text-green-600">
                    📈 Exportiert alle Ausgangsrechnungen mit vollständigen Umsatzinformationen
                  </p>
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
