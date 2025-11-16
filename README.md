
# 🧾 Rechnungsverwaltung App

Moderne Rechnungsverwaltungssoftware mit KI-gestützter Datenextraktion und automatischer E-Mail-Überwachung.

## ✨ Hauptfunktionen

### 📥 Intelligente Import-Funktionen
- **ZIP-Import**: Importieren Sie mehrere Rechnungen auf einmal (40+ Dateien gleichzeitig)
- **KI-Datenextraktion**: Automatische Erkennung von Rechnungsdaten aus PDF-Dateien
- **CSV-Import**: Massenimport über CSV-Dateien
- **E-Mail-Monitoring**: Automatische Verarbeitung eingehender Rechnungen per E-Mail

### 📊 Dashboard & Statistiken
- Echtzeit-KPI-Übersicht (Einnahmen, Ausgaben, MwSt)
- Interaktive Diagramme für monatliche Trends
- Filterbare Rechnungslisten
- Exportfunktionen (CSV, Excel)

### 💰 Rechnungstypen
- **Eingang**: Eingangsrechnungen (Ausgaben)
- **Ausgang**: Ausgangsrechnungen (Verkäufe/Einnahmen)

### 🔐 Sicherheit & Authentifizierung
- NextAuth.js Integration
- Sichere Passwort-Verschlüsselung
- Session-Management

## 🛠️ Technologie-Stack

### Frontend
- **Framework**: Next.js 14.2.28 (App Router)
- **UI**: React 18.2, Tailwind CSS 3.3
- **Komponenten**: Radix UI, shadcn/ui
- **State Management**: React Hooks, Zustand
- **Charts**: Recharts, Plotly.js

### Backend
- **Runtime**: Node.js
- **Database**: PostgreSQL (Prisma ORM)
- **File Storage**: AWS S3
- **Authentication**: NextAuth.js
- **AI Integration**: Abacus.AI GPT-4.1

### DevOps
- **Package Manager**: Yarn
- **Deployment**: Vercel/Custom
- **Version Control**: Git

## 📁 Projektstruktur

```
rechnungsverwaltung_app/
├── nextjs_space/              # Next.js Hauptanwendung
│   ├── app/
│   │   ├── api/              # API Routes
│   │   ├── dashboard/        # Dashboard-Seite
│   │   ├── rechnungen/       # Eingangsrechnungen
│   │   ├── verkaufsrechnungen/ # Ausgangsrechnungen
│   │   ├── statistiken/      # Statistik-Seite
│   │   └── export/           # Export-Funktionen
│   ├── components/           # Wiederverwendbare Komponenten
│   ├── lib/                  # Utility-Funktionen
│   ├── prisma/              # Datenbankschema
│   └── public/              # Statische Assets
├── scripts/                  # Python-Skripte
│   ├── email_monitor.py     # E-Mail-Überwachung
│   ├── extract_invoice_data.py # PDF-Extraktion
│   └── import_invoice_to_db.py # DB-Import
├── data/                     # Datenverzeichnis
├── invoices/                # Lokale PDF-Speicherung
└── logs/                    # Log-Dateien
```

## 🚀 Installation & Setup

### Voraussetzungen
- Node.js 18+
- PostgreSQL Datenbank
- AWS S3 Account
- Abacus.AI API Key

### Installation

```bash
# Repository klonen
git clone <repository-url>
cd rechnungsverwaltung_app/nextjs_space

# Dependencies installieren
yarn install

# Prisma Client generieren
yarn prisma generate

# Umgebungsvariablen konfigurieren
cp .env.example .env
# .env Datei mit Ihren Credentials ausfüllen
```

### Umgebungsvariablen

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://ihre-domain.com"
AWS_PROFILE=hosted_storage
AWS_REGION=us-west-2
AWS_BUCKET_NAME="..."
AWS_FOLDER_PREFIX="..."
ABACUSAI_API_KEY="..."
```

### Entwicklung starten

```bash
cd nextjs_space
yarn dev
# Öffne http://localhost:3000
```

### Produktion Build

```bash
yarn build
yarn start
```

## 📦 Hauptfunktionen im Detail

### ZIP-Import mit KI-Extraktion
```typescript
// Automatische Verarbeitung von 40+ Rechnungen
// Inklusive Fortschrittsanzeige und Fehlerbehandlung
await fetch('/api/async-zip-import', {
  method: 'POST',
  body: formData
});
```

### Rechnungstyp-Management
- Eingang: Ausgaben für Buchhaltung
- Ausgang: Verkaufsrechnungen/Einnahmen
- Automatische Kategorisierung beim Import

### E-Mail-Überwachung
```python
# scripts/email_monitor.py
# Überwacht IMAP-Postfach auf neue Rechnungen
# Extrahiert Daten und speichert in DB
```

## 🔄 Letzte Updates

### ✅ Version: ZIP import NEXTAUTH_URL düzeltme (16.11.2025)
- ZIP-Import Bug behoben (NEXTAUTH_URL konfiguriert)
- MwSt-Berechnung korrigiert (153% Fehler behoben)
- Datenkonsistenz verbessert
- Async Import System für 500+ Rechnungen
- Badge-Kontrast für bessere Lesbarkeit

## 📊 Statistiken

- ✅ **362 Rechnungen** in der Datenbank
- ✅ **360 Eingangsrechnungen**
- ✅ **2 Ausgangsrechnungen**
- ✅ **10+ Git Commits** mit vollständiger Historie

## 🐛 Bekannte Probleme & Lösungen

### ZIP-Import zeigt "40 Dateien verarbeitet" aber keine Rechnungen
**Lösung**: NEXTAUTH_URL in .env hinzufügen ✅ (behoben)

### MwSt-Berechnung zeigt 153%
**Lösung**: Null-Werte werden jetzt korrekt behandelt ✅ (behoben)

## 📝 Lizenz

Privates Projekt - Alle Rechte vorbehalten

## 👨‍💻 Entwicklung

Entwickelt mit DeepAgent (Abacus.AI)  
Letzte Aktualisierung: November 2025

---

**Bereitstellung**: https://ismailkar-buchhaltung.abacusai.app
