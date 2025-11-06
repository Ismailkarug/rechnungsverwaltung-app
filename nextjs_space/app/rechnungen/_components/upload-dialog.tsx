
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
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

export function UploadDialog({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    rechnungsnummer: '',
    datum: '',
    lieferant: '',
    betragNetto: '',
    mwstSatz: '19',
    mwstBetrag: '',
    betragBrutto: '',
    leistungszeitraum: '',
    status: 'Unbezahlt'
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast.error('Bitte wählen Sie eine PDF-Datei aus');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate MwSt and Brutto if Netto and MwSt rate are provided
      if (field === 'betragNetto' || field === 'mwstSatz') {
        const netto = parseFloat(newData.betragNetto);
        const mwstRate = parseFloat(newData.mwstSatz);
        
        if (!isNaN(netto) && !isNaN(mwstRate)) {
          const mwstBetrag = (netto * mwstRate) / 100;
          const brutto = netto + mwstBetrag;
          
          newData.mwstBetrag = mwstBetrag.toFixed(2);
          newData.betragBrutto = brutto.toFixed(2);
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Bitte wählen Sie eine Datei aus');
      return;
    }

    if (!formData.rechnungsnummer || !formData.datum || !formData.lieferant || !formData.betragNetto) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      Object.entries(formData).forEach(([key, value]) => {
        uploadFormData.append(key, value);
      });

      const response = await fetch('/api/upload-invoice', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const result = await response.json();
      
      toast.success('Rechnung erfolgreich hochgeladen!');
      setOpen(false);
      
      // Reset form
      setSelectedFile(null);
      setFormData({
        rechnungsnummer: '',
        datum: '',
        lieferant: '',
        betragNetto: '',
        mwstSatz: '19',
        mwstBetrag: '',
        betragBrutto: '',
        leistungszeitraum: '',
        status: 'Unbezahlt'
      });

      // Refresh the page to show the new invoice
      if (onUploadSuccess) {
        onUploadSuccess();
      } else {
        window.location.reload();
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen der Rechnung');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Rechnung hochladen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Rechnung hochladen</DialogTitle>
          <DialogDescription>
            Laden Sie eine PDF-Rechnung hoch und geben Sie die Details ein.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">PDF-Datei *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="flex-1"
              />
              {selectedFile && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rechnungsnummer">Rechnungsnummer *</Label>
              <Input
                id="rechnungsnummer"
                value={formData.rechnungsnummer}
                onChange={(e) => handleInputChange('rechnungsnummer', e.target.value)}
                placeholder="z.B. RE-2024-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datum">Rechnungsdatum *</Label>
              <Input
                id="datum"
                type="date"
                value={formData.datum}
                onChange={(e) => handleInputChange('datum', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lieferant">Lieferant *</Label>
            <Input
              id="lieferant"
              value={formData.lieferant}
              onChange={(e) => handleInputChange('lieferant', e.target.value)}
              placeholder="z.B. Amazon, DHL, Telekom"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="betragNetto">Betrag Netto (EUR) *</Label>
              <Input
                id="betragNetto"
                type="number"
                step="0.01"
                value={formData.betragNetto}
                onChange={(e) => handleInputChange('betragNetto', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mwstSatz">MwSt-Satz (%)</Label>
              <Select value={formData.mwstSatz} onValueChange={(value) => handleInputChange('mwstSatz', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="7">7%</SelectItem>
                  <SelectItem value="19">19%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mwstBetrag">MwSt-Betrag (EUR)</Label>
              <Input
                id="mwstBetrag"
                type="number"
                step="0.01"
                value={formData.mwstBetrag}
                onChange={(e) => handleInputChange('mwstBetrag', e.target.value)}
                placeholder="0.00"
                readOnly
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="betragBrutto">Betrag Brutto (EUR) *</Label>
            <Input
              id="betragBrutto"
              type="number"
              step="0.01"
              value={formData.betragBrutto}
              onChange={(e) => handleInputChange('betragBrutto', e.target.value)}
              placeholder="0.00"
              readOnly
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leistungszeitraum">Leistungszeitraum</Label>
              <Input
                id="leistungszeitraum"
                value={formData.leistungszeitraum}
                onChange={(e) => handleInputChange('leistungszeitraum', e.target.value)}
                placeholder="z.B. 01/2024 oder Q1 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unbezahlt">Unbezahlt</SelectItem>
                  <SelectItem value="Bezahlt">Bezahlt</SelectItem>
                  <SelectItem value="Überfällig">Überfällig</SelectItem>
                  <SelectItem value="Storniert">Storniert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
