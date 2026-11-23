import { useMemo, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PerformanceChart } from './PerformanceChart';
import { getBDEChartData, MONTHS } from '@/data/dataProcess';
import { SalesRecord } from '@/types';
import { api } from '@/lib/api';
import { Briefcase, Calendar, Building2 } from 'lucide-react';

interface BdePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bdeName: string | null;
  records: SalesRecord[];
}

export function BdePerformanceModal({ isOpen, onClose, bdeName, records }: BdePerformanceModalProps) {
  const [selectedDrive, setSelectedDrive] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
  const [drives, setDrives] = useState<any[]>([]);

  const getFinancialYear = (r: SalesRecord) => {
    const yearNum = parseInt(r.fy) || 2025;
    if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
      return (yearNum - 1).toString();
    }
    return yearNum.toString();
  };

  const availableFinancialYears = useMemo(() => {
    const years = new Set(records.map(r => getFinancialYear(r)).filter(fy => fy));
    return Array.from(years).sort().reverse();
  }, [records]);

  useEffect(() => {
    if (isOpen) {
      api.getDrives().then(setDrives).catch(console.error);
    }
  }, [isOpen]);

  const filteredRecords = useMemo(() => {
    let filtered = records;

    if (selectedFinancialYear) {
      filtered = filtered.filter(r => getFinancialYear(r) === selectedFinancialYear);
    }

    if (selectedDrive) {
      const matchedDrive = drives.find(d => d.name === selectedDrive);
      if (matchedDrive) {
        const monthToNumber: Record<string, number> = {
          'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
          'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
        };
        filtered = filtered.filter(r => {
          const recordMonthNum = monthToNumber[r.month];
          if (matchedDrive.startMonth <= matchedDrive.endMonth) {
            return recordMonthNum >= matchedDrive.startMonth && recordMonthNum <= matchedDrive.endMonth;
          } else {
            return recordMonthNum >= matchedDrive.startMonth || recordMonthNum <= matchedDrive.endMonth;
          }
        });
      }
    }

    if (selectedMonth) {
      filtered = filtered.filter(r => r.month === selectedMonth);
    }

    return filtered;
  }, [records, selectedDrive, selectedMonth, selectedFinancialYear, drives]);

  const chartData = useMemo(() => {
    if (!bdeName) return [];
    return getBDEChartData(filteredRecords, bdeName);
  }, [filteredRecords, bdeName]);

  const driveNames = useMemo(() => Array.from(new Set(drives.map(d => d.name))), [drives]);
  const availableMonths = useMemo(() => {
    const months = new Set(filteredRecords.map(r => r.month));
    return MONTHS.filter(m => months.has(m));
  }, [filteredRecords]);

  if (!bdeName || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader className="w-full">
          <DialogTitle>Individual Performance: {bdeName}</DialogTitle>
          <DialogDescription>
            Monthly performance overview for {bdeName}.
          </DialogDescription>
        </DialogHeader>

        {/* Filter Section */}
        <div className="flex items-center gap-4 mt-4 pb-4 border-b border-border flex-wrap">
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedFinancialYear}
              onChange={(e) => setSelectedFinancialYear(e.target.value)}
              className="input-field py-1 pr-8 text-sm min-w-[130px]"
            >
              <option value="">All FYs</option>
              {availableFinancialYears.map(fy => (
                <option key={fy} value={fy}>FY {fy}-{parseInt(fy)%100 + 1}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedDrive}
              onChange={(e) => {
                setSelectedDrive(e.target.value);
                setSelectedMonth('');
              }}
              className="input-field py-1 pr-8 text-sm min-w-[150px]"
            >
              <option value="">All Drives</option>
              {driveNames.map(drive => (
                <option key={drive} value={drive}>{drive}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field py-1 pr-8 text-sm min-w-[140px]"
            >
              <option value="">All Months</option>
              {(selectedDrive ? availableMonths : MONTHS).map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          {(selectedDrive || selectedMonth || selectedFinancialYear) && (
            <button
              onClick={() => {
                setSelectedDrive('');
                setSelectedMonth('');
                setSelectedFinancialYear('');
              }}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-[80vh] overflow-y-auto mt-4 w-full pr-2">
          <PerformanceChart data={chartData} title={`Monthly Performance - ${bdeName}`} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
