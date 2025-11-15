
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Download,
  Home,
  Receipt
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Übersicht & Kennzahlen"
  },
  {
    name: "Rechnungen",
    href: "/rechnungen", 
    icon: FileText,
    description: "Eingangsrechnungen (Ausgaben)",
    badge: "Ausgaben",
    badgeColor: "red"
  },
  {
    name: "Verkaufsrechnungen",
    href: "/verkaufsrechnungen", 
    icon: Receipt,
    description: "Ausgangsrechnungen (Einnahmen)",
    badge: "Einnahmen",
    badgeColor: "green"
  },
  {
    name: "Statistiken",
    href: "/statistiken",
    icon: TrendingUp,
    description: "Detaillierte Auswertungen"
  },
  {
    name: "Export",
    href: "/export",
    icon: Download,
    description: "Daten exportieren"
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg">
      <div className="flex flex-col h-full">
        {/* Logo/Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600">
          <div className="flex items-center gap-3">
            <Receipt className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-lg font-bold text-white">
                Rechnungs­verwaltung
              </h1>
              <p className="text-xs text-blue-100">
                Professional Edition
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-50",
                    isActive 
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" 
                      : "text-gray-700 hover:text-gray-900"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                    )} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {item.name}
                      {'badge' in item && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            item.badgeColor === "red" && "bg-red-50 text-red-700 border-red-200",
                            item.badgeColor === "green" && "bg-green-50 text-green-700 border-green-200"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <div className={cn(
                      "text-xs",
                      isActive ? "text-blue-600" : "text-gray-500"
                    )}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            <p>© 2025 Rechnungsverwaltung</p>
            <p className="mt-1">Powered by Next.js & Prisma</p>
          </div>
        </div>
      </div>
    </div>
  );
}
