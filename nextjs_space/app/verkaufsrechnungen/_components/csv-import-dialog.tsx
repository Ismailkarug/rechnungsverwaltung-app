
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Download, Loader2, CheckCircle, XCircle, FileText, Archive } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CSVImportDialog({ onImportSuccess }: { onImportSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv') || fileName.endsWith('.pdf') || fileName.endsWith('.zip')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast.error('Bitte wählen Sie eine CSV-, PDF- oder ZIP-Datei aus');
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = `rechnungsnummer,datum,lieferant,betragNetto,mwstSatz,mwstBetrag,betragBrutto,leistungszeitraum,status
RE-2024-001,2024-01-15,Amazon,100.00,19,19.00,119.00,01/2024,Unbezahlt
RE-2024-002,2024-01-20,DHL,50.00,19,9.50,59.50,01/2024,Bezahlt
RE-2024-003,2024-02-01,Telekom,75.50,19,14.35,89.85,02/2024,Unbezahlt`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rechnungen_vorlage.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV-Vorlage heruntergeladen');
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie eine Datei aus');
      return;
    }

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('typ', 'Ausgang'); // Set type to 'Ausgang' for sales invoices

      const response = await fetch('/api/unified-import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import fehlgeschlagen');
      }

      const result = await response.json();
      setImportResult(result);
      
      toast.success(`${result.summary.success} von ${result.summary.total} Rechnungen erfolgreich importiert!`);
      
      if (result.summary.failed > 0) {
        toast.error(`${result.summary.failed} Rechnungen konnten nicht importiert werden`);
      }

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Fehler beim Importieren der Datei');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setImportResult(null);
    
    if (importResult && importResult.summary.success > 0) {
      if (onImportSuccess) {
        onImportSuccess();
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          CSV Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rechnungen importieren</DialogTitle>
          <DialogDescription>
            Importieren Sie Rechnungen aus CSV, PDF oder ZIP-Dateien. PDFs werden automatisch mit KI ausgelesen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Benötigen Sie eine CSV-Vorlage?</span>
              <Button
                variant="link"
                size="sm"
                onClick={downloadTemplate}
                className="h-auto p-0"
              >
                CSV-Vorlage herunterladen
              </Button>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Datei auswählen</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,.pdf,.zip"
              onChange={handleFileChange}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {selectedFile.name.toLowerCase().endsWith('.csv') && <FileSpreadsheet className="h-4 w-4" />}
                {selectedFile.name.toLowerCase().endsWith('.pdf') && <FileText className="h-4 w-4" />}
                {selectedFile.name.toLowerCase().endsWith('.zip') && <Archive className="h-4 w-4" />}
                {selectedFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Unterstützte Formate:</Label>
            <div className="text-sm text-muted-foreground space-y-2 bg-muted p-3 rounded-md">
              <div className="flex items-start gap-2">
                <FileSpreadsheet className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium">CSV-Dateien:</p>
                  <p className="text-xs"><strong>Pflichtfelder:</strong> rechnungsnummer, datum, lieferant, betragNetto, betragBrutto</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium">PDF-Dateien:</p>
                  <p className="text-xs">Werden automatisch mit KI ausgelesen und gespeichert</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Archive className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium">ZIP-Dateien:</p>
                  <p className="text-xs">Enthaltene PDF- und CSV-Dateien werden automatisch verarbeitet</p>
                </div>
              </div>
            </div>
          </div>

          {importResult && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Import-Ergebnis</h4>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {importResult.summary.success} erfolgreich
                    </span>
                    {importResult.summary.failed > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-4 w-4" />
                        {importResult.summary.failed} fehlgeschlagen
                      </span>
                    )}
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <Label className="text-sm">Fehler:</Label>
                    {importResult.errors.map((error: any, index: number) => (
                      <div key={index} className="text-sm p-2 bg-destructive/10 rounded-md flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium">{error.rechnungsnummer}</p>
                          <p className="text-muted-foreground">{error.error}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {importResult.savedInvoices && importResult.savedInvoices.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <Label className="text-sm">Erfolgreich importiert:</Label>
                    {importResult.savedInvoices.slice(0, 5).map((invoice: any, index: number) => (
                      <div key={index} className="text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded-md flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{invoice.rechnungsnummer} - {invoice.lieferant} ({invoice.betragBrutto}€)</span>
                      </div>
                    ))}
                    {importResult.savedInvoices.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        ... und {importResult.savedInvoices.length - 5} weitere
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {importResult ? 'Schließen' : 'Abbrechen'}
            </Button>
            {!importResult && (
              <Button 
                onClick={handleImport} 
                disabled={importing || !selectedFile}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importiere...
                  </>
                ) : (
                  'Importieren'
                )}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
