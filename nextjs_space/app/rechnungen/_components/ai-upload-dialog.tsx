
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Sparkles, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExtractedInvoice {
  fileName: string;
  success: boolean;
  error?: string;
  cloudStoragePath?: string;
  extractedData?: {
    rechnungsnummer: string;
    datum: string;
    lieferant: string;
    betragNetto: number;
    mwstSatz: string;
    mwstBetrag: number;
    betragBrutto: number;
    leistungszeitraum: string | null;
    status: string;
  };
}

export function AIUploadDialog({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractedInvoices, setExtractedInvoices] = useState<ExtractedInvoice[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const pdfFiles = files.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length !== files.length) {
        toast.error('Nur PDF-Dateien sind erlaubt');
      }
      
      if (pdfFiles.length > 0) {
        setSelectedFiles(pdfFiles);
      }
    }
  };

  const handleExtract = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine PDF-Datei aus');
      return;
    }

    setExtracting(true);
    setUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/extract-invoice-data', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Extraktion fehlgeschlagen');
      }

      const result = await response.json();
      setExtractedInvoices(result.results);
      
      const successCount = result.results.filter((r: ExtractedInvoice) => r.success).length;
      toast.success(`${successCount} von ${result.results.length} Rechnungen erfolgreich extrahiert!`);

    } catch (error) {
      console.error('Extract error:', error);
      toast.error('Fehler beim Extrahieren der Rechnungsdaten');
    } finally {
      setExtracting(false);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const invoicesToSave = extractedInvoices
      .filter(inv => inv.success && inv.extractedData)
      .map(inv => ({
        ...inv.extractedData!,
        cloudStoragePath: inv.cloudStoragePath
      }));

    if (invoicesToSave.length === 0) {
      toast.error('Keine Rechnungen zum Speichern vorhanden');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/save-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invoices: invoicesToSave })
      });

      if (!response.ok) {
        throw new Error('Speichern fehlgeschlagen');
      }

      const result = await response.json();
      
      toast.success(`${result.savedInvoices.length} Rechnungen erfolgreich gespeichert!`);
      
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} Rechnungen konnten nicht gespeichert werden`);
      }

      setOpen(false);
      
      // Reset
      setSelectedFiles([]);
      setExtractedInvoices([]);

      if (onUploadSuccess) {
        onUploadSuccess();
      } else {
        window.location.reload();
      }

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern der Rechnungen');
    } finally {
      setSaving(false);
    }
  };

  const updateInvoiceData = (index: number, field: string, value: any) => {
    setExtractedInvoices(prev => {
      const updated = [...prev];
      if (updated[index].extractedData) {
        updated[index].extractedData = {
          ...updated[index].extractedData!,
          [field]: value
        };
      }
      return updated;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          KI-Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KI-gestützte Rechnungserkennung</DialogTitle>
          <DialogDescription>
            Laden Sie eine oder mehrere PDF-Rechnungen hoch. Unsere KI extrahiert automatisch alle relevanten Daten.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {extractedInvoices.length === 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="files">PDF-Dateien (Max 10MB pro Datei)</Label>
                <Input
                  id="files"
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Ausgewählte Dateien ({selectedFiles.length})</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleExtract} 
                disabled={uploading || selectedFiles.length === 0}
                className="w-full"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extrahiere Daten...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Mit KI extrahieren
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Extrahierte Rechnungen ({extractedInvoices.filter(i => i.success).length}/{extractedInvoices.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExtractedInvoices([]);
                    setSelectedFiles([]);
                  }}
                >
                  Zurücksetzen
                </Button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {extractedInvoices.map((invoice, index) => (
                  <Card key={index} className={!invoice.success ? 'border-destructive' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {invoice.success ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <X className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{invoice.fileName}</span>
                            {invoice.success && (
                              <Badge variant="secondary" className="ml-auto">
                                Erfolgreich
                              </Badge>
                            )}
                          </div>

                          {invoice.success && invoice.extractedData && (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Rechnungsnummer</Label>
                                <Input
                                  value={invoice.extractedData.rechnungsnummer}
                                  onChange={(e) => updateInvoiceData(index, 'rechnungsnummer', e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Datum</Label>
                                <Input
                                  type="date"
                                  value={invoice.extractedData.datum}
                                  onChange={(e) => updateInvoiceData(index, 'datum', e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Lieferant</Label>
                                <Input
                                  value={invoice.extractedData.lieferant}
                                  onChange={(e) => updateInvoiceData(index, 'lieferant', e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Netto (EUR)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={invoice.extractedData.betragNetto}
                                  onChange={(e) => updateInvoiceData(index, 'betragNetto', parseFloat(e.target.value))}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">MwSt-Satz</Label>
                                <Select 
                                  value={invoice.extractedData.mwstSatz} 
                                  onValueChange={(value) => updateInvoiceData(index, 'mwstSatz', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="7">7%</SelectItem>
                                    <SelectItem value="19">19%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Brutto (EUR)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={invoice.extractedData.betragBrutto}
                                  onChange={(e) => updateInvoiceData(index, 'betragBrutto', parseFloat(e.target.value))}
                                  className="h-8"
                                />
                              </div>
                            </div>
                          )}

                          {!invoice.success && invoice.error && (
                            <div className="text-sm text-destructive">
                              Fehler: {invoice.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || extractedInvoices.filter(i => i.success).length === 0}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Speichere...
                    </>
                  ) : (
                    `${extractedInvoices.filter(i => i.success).length} Rechnungen speichern`
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
