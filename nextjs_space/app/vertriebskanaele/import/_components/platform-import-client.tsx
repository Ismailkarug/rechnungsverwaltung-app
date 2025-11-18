
'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, FileText, Archive, ShoppingCart, Package, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type Platform = 'EBAY' | 'AMAZON' | 'SHOPIFY';
type FileType = 'csv' | 'pdf' | 'zip';

export default function PlatformImportClient() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  });

  const platforms = [
    { id: 'EBAY' as Platform, name: 'eBay', icon: ShoppingCart, color: 'text-yellow-600 bg-yellow-50' },
    { id: 'AMAZON' as Platform, name: 'Amazon', icon: Package, color: 'text-orange-600 bg-orange-50' },
    { id: 'SHOPIFY' as Platform, name: 'Shopify', icon: Store, color: 'text-green-600 bg-green-50' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'pdf', 'zip'].includes(fileType || '')) {
        toast.error('Ungültiger Dateityp. Bitte wählen Sie CSV, PDF oder ZIP.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!selectedPlatform || !file) {
      toast.error('Bitte wählen Sie eine Plattform und eine Datei aus.');
      return;
    }

    setIsUploading(true);
    setProgress({ total: 0, processed: 0, succeeded: 0, failed: 0, skipped: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform', selectedPlatform);
      formData.append('invoiceType', 'Eingang'); // Platform invoices are incoming

      const response = await fetch('/api/platform-import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import fehlgeschlagen');
      }

      setProgress({
        total: result.summary.total,
        processed: result.summary.processed,
        succeeded: result.summary.succeeded,
        failed: result.summary.failed,
        skipped: result.summary.skipped,
      });

      if (result.summary.succeeded > 0) {
        toast.success(`${result.summary.succeeded} Rechnungen erfolgreich importiert!`);
      }

      if (result.summary.failed > 0) {
        // Show detailed error information
        const failedInvoices = result.results.filter((r: any) => !r.success && r.error !== 'Rechnung bereits vorhanden');
        const errorMessages = failedInvoices.map((r: any) => `${r.fileName}: ${r.error}`).join('\n');
        
        toast.error(
          `${result.summary.failed} Rechnungen konnten nicht importiert werden:\n${errorMessages.substring(0, 200)}${errorMessages.length > 200 ? '...' : ''}`,
          { duration: 10000 }
        );
        
        console.error('Failed invoices:', failedInvoices);
      }

      // Reset form
      setFile(null);
      setSelectedPlatform(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Import');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return <FileSpreadsheet className="h-5 w-5" />;
    if (ext === 'pdf') return <FileText className="h-5 w-5" />;
    if (ext === 'zip') return <Archive className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Plattform-Rechnungen importieren
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Importieren Sie Rechnungen von eBay, Amazon oder Shopify als CSV, PDF oder ZIP
        </p>
      </div>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle>1. Plattform auswählen</CardTitle>
          <CardDescription>Wählen Sie die E-Commerce-Plattform aus</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const isSelected = selectedPlatform === platform.id;
              
              return (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`
                    p-6 rounded-xl border-2 transition-all duration-200
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center mb-4 mx-auto`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{platform.name}</h3>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>2. Datei hochladen</CardTitle>
          <CardDescription>CSV, PDF oder ZIP-Datei mit Rechnungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                id="file-upload"
                type="file"
                accept=".csv,.pdf,.zip"
                onChange={handleFileChange}
                disabled={!selectedPlatform || isUploading}
                className="block w-full text-sm text-gray-900 dark:text-gray-100 
                         border border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer 
                         bg-gray-50 dark:bg-gray-800 focus:outline-none
                         disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {getFileIcon(file.name)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Button */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={handleImport}
          disabled={!selectedPlatform || !file || isUploading}
          size="lg"
          className="min-w-[200px]"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Importiere...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import starten
            </>
          )}
        </Button>
      </div>

      {/* Progress Display */}
      {isUploading && progress.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import-Fortschritt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Verarbeitet</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {progress.processed} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{progress.succeeded}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Erfolgreich</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{progress.skipped}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Übersprungen</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{progress.failed}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Fehlgeschlagen</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {!isUploading && progress.total > 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">Import abgeschlossen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>{progress.succeeded}</strong> von <strong>{progress.total}</strong> Rechnungen wurden erfolgreich importiert
              </p>
              {progress.skipped > 0 && (
                <p className="text-yellow-700 dark:text-yellow-400">
                  {progress.skipped} Rechnungen wurden übersprungen (bereits vorhanden)
                </p>
              )}
              {progress.failed > 0 && (
                <p className="text-red-700 dark:text-red-400">
                  {progress.failed} Rechnungen konnten nicht verarbeitet werden
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Unterstützte Dateiformate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">CSV-Dateien</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Strukturierte Rechnungsdaten im CSV-Format. Ideal für Massenimporte.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">PDF-Dateien</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Einzelne Rechnungen als PDF. KI extrahiert automatisch alle Daten.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">ZIP-Archive</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mehrere PDF-Rechnungen in einem ZIP. Alle werden automatisch verarbeitet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
