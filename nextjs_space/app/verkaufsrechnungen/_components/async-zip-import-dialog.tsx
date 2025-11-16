
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileArchive, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AsyncZIPImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
  status: 'processing' | 'completed' | 'failed';
  progressPercent: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
}

export default function AsyncZIPImportDialog({ open, onOpenChange, onImportComplete }: AsyncZIPImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Poll progress
  useEffect(() => {
    if (!importId || !importing) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/async-zip-import?importId=${importId}`);
        if (response.ok) {
          const data: ImportProgress = await response.json();
          setProgress(data);

          if (data.status === 'completed') {
            setImporting(false);
            toast.success(`Import abgeschlossen! ${data.successful} erfolgreich, ${data.skipped} übersprungen, ${data.failed} fehlgeschlagen`);
            onImportComplete();
            clearInterval(interval);
          } else if (data.status === 'failed') {
            setImporting(false);
            toast.error('Import fehlgeschlagen');
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [importId, importing, onImportComplete]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
        toast.error('Bitte wählen Sie eine ZIP-Datei');
        return;
      }
      setFile(selectedFile);
      setProgress(null);
      setImportId(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Bitte wählen Sie eine ZIP-Datei');
      return;
    }

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipDuplicates', skipDuplicates.toString());
      formData.append('invoiceType', 'Ausgang'); // Ausgangsrechnungen (Verkaufsrechnungen)

      const response = await fetch('/api/async-zip-import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import-Fehler');
      }

      const result = await response.json();
      setImportId(result.importId);
      
      toast.success(`Import gestartet: ${result.totalFiles} Dateien werden verarbeitet. Sie können weiterarbeiten!`, {
        duration: 5000
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Fehler beim Import');
      setImporting(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const handleClose = () => {
    if (importing && progress?.status === 'processing') {
      toast.info('Import läuft weiter im Hintergrund');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Große ZIP-Dateien importieren
          </DialogTitle>
          <DialogDescription>
            Laden Sie ZIP-Dateien mit bis zu 500+ Verkaufsrechnungen hoch. Der Import läuft im Hintergrund - Sie können weiterarbeiten!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Selection */}
          {!importing && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                  id="zip-file-input-verkauf"
                />
                <label htmlFor="zip-file-input-verkauf" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-2">
                    {file ? file.name : 'ZIP-Datei auswählen oder hierher ziehen'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Unterstützt große Dateien mit 500+ PDF-Verkaufsrechnungen
                  </p>
                </label>
              </div>

              {/* Duplicate Handling Option */}
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="skip-duplicates-verkauf"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
                />
                <Label htmlFor="skip-duplicates-verkauf" className="text-sm cursor-pointer">
                  Duplikate überspringen (bei deaktiviert: bestehende Rechnungen aktualisieren)
                </Label>
              </div>

              <Button onClick={handleImport} disabled={!file} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Import starten
              </Button>
            </div>
          )}

          {/* Progress Display */}
          {importing && progress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Fortschritt</span>
                  <span className="text-gray-500">
                    {progress.processed} / {progress.total} ({progress.progressPercent}%)
                  </span>
                </div>
                <Progress value={progress.progressPercent} className="h-3" />
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <div className="text-lg font-bold text-green-700">{progress.successful}</div>
                  <div className="text-xs text-green-600">Erfolgreich</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                  <div className="text-lg font-bold text-yellow-700">{progress.skipped}</div>
                  <div className="text-xs text-yellow-600">Übersprungen</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                  <div className="text-lg font-bold text-red-700">{progress.failed}</div>
                  <div className="text-xs text-red-600">Fehlgeschlagen</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Loader2 className="h-5 w-5 mx-auto text-blue-600 mb-1 animate-spin" />
                  <div className="text-lg font-bold text-blue-700">{progress.total - progress.processed}</div>
                  <div className="text-xs text-blue-600">Verbleibend</div>
                </div>
              </div>

              {/* Time Information */}
              <div className="flex justify-between text-sm text-gray-600 px-2">
                <span>Vergangene Zeit: {formatTime(progress.elapsedTime)}</span>
                {progress.estimatedTimeRemaining > 0 && progress.status === 'processing' && (
                  <span>Geschätzte Restzeit: {formatTime(progress.estimatedTimeRemaining)}</span>
                )}
              </div>

              {/* Errors */}
              {progress.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                    <XCircle className="h-4 w-4" />
                    Fehler ({progress.errors.length})
                  </div>
                  <ScrollArea className="h-32 border rounded-lg p-3 bg-red-50">
                    {progress.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600 mb-1">
                        • {error}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Status Message */}
              {progress.status === 'processing' && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Loader2 className="h-6 w-6 mx-auto text-blue-600 mb-2 animate-spin" />
                  <p className="text-sm text-blue-700">
                    Import läuft im Hintergrund. Sie können dieses Fenster schließen und weiterarbeiten!
                  </p>
                </div>
              )}

              {progress.status === 'completed' && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-green-700 font-medium">
                    Import abgeschlossen!
                  </p>
                </div>
              )}

              {progress.status === 'failed' && (
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-6 w-6 mx-auto text-red-600 mb-2" />
                  <p className="text-sm text-red-700 font-medium">
                    Import fehlgeschlagen
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          {(progress?.status === 'completed' || progress?.status === 'failed' || !importing) && (
            <Button onClick={handleClose} variant="outline" className="w-full">
              Schließen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
