# ✅ Automatisches Rechnungs-Import-System

## 📧 E-Mail-Überwachung eingerichtet

Das System überwacht jetzt automatisch **rechnungismailkar@gmail.com** und importiert Rechnungen direkt in die App!

---

## 🔄 So funktioniert es

### Automatischer Ablauf:
1. **Stündliche Überprüfung** - Das System prüft jede Stunde neue E-Mails
2. **PDF-Erkennung** - Findet automatisch PDF-Anhänge in E-Mails
3. **Daten-Extraktion** - Liest Rechnungsdaten aus dem PDF:
   - Rechnungsnummer
   - Datum
   - Lieferant
   - Beträge (Netto, MwSt, Brutto)
   - Leistungszeitraum
4. **Datenbank-Import** - Speichert die Rechnung automatisch in der App
5. **E-Mail markieren** - Markiert verarbeitete E-Mails als "gelesen"

---

## 📝 Erste Rechnung erfolgreich importiert!

### DHL-Rechnung 1749617659
- **Rechnungsnummer:** 1749617659
- **Datum:** 31.10.2025
- **Lieferant:** DHL Paket GmbH
- **Betrag Netto:** 276,24 EUR
- **MwSt (19%):** 52,49 EUR
- **Betrag Brutto:** 328,73 EUR
- **Leistungszeitraum:** 10.2025
- **Status:** Neu

✅ **Die Rechnung ist jetzt in der App sichtbar!**

---

## 🛠️ Technische Details

### Erstellte Scripts:
1. **`extract_invoice_data.py`** - Extrahiert Daten aus PDF-Rechnungen
   - Erkennt deutsche Formate
   - Unterstützt verschiedene Rechnungslayouts
   - Validiert und berechnet fehlende Werte

2. **`import_invoice_to_db.py`** - Importiert Rechnungen in die Datenbank
   - Vermeidet Duplikate
   - Aktualisiert bestehende Rechnungen
   - Direkte PostgreSQL-Verbindung

### Daemon-Task:
- **Name:** Automatischer Rechnungs-Import aus Gmail
- **Zeitplan:** Alle 60 Minuten (stündlich)
- **Status:** ✅ AKTIV
- **Nächste Ausführung:** In weniger als einer Stunde

### Speicherorte:
- **PDF-Rechnungen:** `/home/ubuntu/rechnungsverwaltung_app/invoices/`
- **Logs:** `/home/ubuntu/rechnungsverwaltung_app/logs/`
- **Scripts:** `/home/ubuntu/rechnungsverwaltung_app/scripts/`

---

## 🚀 Verwendung

### Rechnungen senden:
1. Senden Sie eine E-Mail mit PDF-Rechnung als Anhang an: **rechnungismailkar@gmail.com**
2. Warten Sie bis zu 1 Stunde
3. Die Rechnung erscheint automatisch in der App!

### Manuelle Verarbeitung:
Falls Sie eine Rechnung sofort verarbeiten möchten:
```bash
# PDF-Daten extrahieren
python3 /home/ubuntu/rechnungsverwaltung_app/scripts/extract_invoice_data.py <pdf-datei>

# In Datenbank importieren
cd /home/ubuntu/rechnungsverwaltung_app/nextjs_space
python3 ../scripts/import_invoice_to_db.py '<json-daten>' '<pdf-dateiname>'
```

---

## 📊 App-Zugriff

**Lokaler Zugriff:**
- URL: `http://localhost:8080`
- Seiten:
  - Dashboard: `/dashboard`
  - Rechnungen: `/rechnungen`
  - Statistiken: `/statistiken`
  - Export: `/export`

**Aktuelle Rechnungen:** 5 Rechnungen in der Datenbank

---

## ⚙️ Systemanforderungen

Installierte Pakete:
- ✅ Python 3
- ✅ PyPDF2 (für PDF-Verarbeitung)
- ✅ psycopg2 (für PostgreSQL)
- ✅ Gmail Tool (für E-Mail-Zugriff)
- ✅ Next.js & Prisma (für die Web-App)

---

## 📈 Nächste Schritte

### Empfohlene Erweiterungen:
1. **OCR-Integration** für gescannte Rechnungen
2. **E-Mail-Benachrichtigungen** bei neuen Importen
3. **Upload-Funktion** in der Web-App
4. **Backup-System** für importierte PDFs

---

## 🔗 Zusammenfassung

✅ **Gmail-Authentifizierung:** Aktiv  
✅ **Daemon-Task:** Läuft stündlich  
✅ **Erste Rechnung:** Erfolgreich importiert  
✅ **Web-App:** Läuft auf Port 8080  
✅ **Datenbank:** Verbunden und funktionsfähig  

**Das System ist vollständig einsatzbereit!** 🎉

---

*Erstellt am: 6. November 2025*  
*System-Version: 1.0*
