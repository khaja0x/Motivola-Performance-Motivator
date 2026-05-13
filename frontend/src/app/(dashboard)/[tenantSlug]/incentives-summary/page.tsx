"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  User, 
  ChevronDown, 
  Download, 
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Target,
  Trophy,
  CheckCircle2,
  Rocket,
  Diamond,
  Flame,
  Info,
  Coins
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import StaffPerformance from '@/components/StaffPerformance';
import { useToast } from '@/components/ui/Toast';

// --- Types ---
interface TierProgress {
  tier: number;
  percentage: number;
  targetGap: string;
  expectedCommission: number;
  status: 'Reached' | 'Progressing' | 'Locked';
}

interface SalesTrend {
  day: number;
  sales: number;
}

interface Milestone {
  label: string;
  icon: React.ReactNode;
  achieved: boolean;
}

// --- Gauge Component ---
const Gauge = ({ value, total, label, isQuantity }: { value: number; total: number; label: string; isQuantity?: boolean }) => {
  const data = [
    { value: Math.max(0, value) },
    { value: Math.max(0, total - value) }
  ];
  const COLORS = ['#22C55E', '#E2E8F0'];
  const isAmount = !isQuantity;

  return (
    <div className="relative w-full h-48 flex items-center justify-center min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-24 text-center">
        <p className="text-2xl font-bold text-slate-900">
          {isAmount ? '$' : ''}{Math.max(0, total - value).toLocaleString('en-US')} {isQuantity ? 'left' : 'to go'}
        </p>
        <p className="text-xs text-slate-500">to reach {label}</p>
        <p className="text-sm font-semibold text-slate-700 mt-2">
          {isAmount ? '$' : ''}{value.toLocaleString('en-US')} / {isAmount ? '$' : ''}{total.toLocaleString('en-US')}
        </p>
      </div>
    </div>
  );
};

export default function IncentivesSummaryPage() {
  const [selectedStaff, setSelectedStaff] = useState('All Staff');
  const [selectedRule, setSelectedRule] = useState('All Rules');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [rulesList, setRulesList] = useState<any[]>([]);
  
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const { success: showSuccess, error: showError } = useToast();

  const handleExportExcel = () => {
    if (!summaryData) return;
    
    try {
      const summaryRows = summaryData.summaryCards.map((c: any) => `${c.label},${c.value}`);
      const tierHeader = "Tier,Range,Target Gap,Earned,Status";
      const tierRows = summaryData.tierProgress.map((t: any) => 
        `${t.tier},"${t.range}","${t.targetGap}",$${Math.floor(t.expectedCommission)},${t.status}`
      );
      
      const csvContent = [
        `Incentive Summary for ${selectedStaff}`,
        `Month: ${selectedMonth}`,
        "",
        "SUMMARY METRICS",
        ...summaryRows,
        "",
        "TIER-WISE PROGRESS",
        tierHeader,
        ...tierRows
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Incentive_Summary_${selectedStaff.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess("Excel export completed successfully!");
    } catch (err) {
      showError("Failed to export Excel file.");
    } finally {
      setIsExportOpen(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportOpen(false);
    showSuccess("Preparing PDF report... Please wait.");
    
    try {
      const htmlToImage = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const content = document.getElementById('pdf-content-area');
      if (!content) throw new Error("Content not found");

      // html-to-image uses the browser's native rendering, which perfectly supports modern CSS like oklch/lab
      const imgData = await htmlToImage.toPng(content, {
        backgroundColor: '#FDFDFD',
        pixelRatio: 2, 
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`Incentive_Summary_${selectedStaff.replace(/\s+/g, '_')}.pdf`);
      
      showSuccess("PDF export completed successfully!");
    } catch (err) {
      console.error("PDF Export Error:", err);
      showError("Failed to export PDF file.");
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });

  const availableMonths = useMemo(() => {
    const now = new Date();
    const result = [];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // Show 6 months back and 6 months forward
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      result.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
    }
    return result;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, rulesRes] = await Promise.all([
          api.get('/api/staff/'),
          api.get('/api/rules/')
        ]);
        setStaffList(staffRes.data);
        setRulesList(rulesRes.data);
        
        if (staffRes.data.length > 0) {
          setSelectedStaff('All Staff');
        }
      } catch (err) {
        console.error("Failed to fetch filter data", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    
    const fetchSummary = async () => {
      // Prevent fetching if we need a staff ID but list isn't ready
      if (selectedStaff && selectedStaff !== 'All Staff' && staffList.length === 0) {
        return;
      }

      setIsLoading(true);
      try {
        const [monthName, yearStr] = selectedMonth.split(' ');
        const monthNum = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(monthName) + 1;
        
        const params: any = {
          month: monthNum,
          year: parseInt(yearStr)
        };
        
        if (selectedStaff && selectedStaff !== 'All Staff') {
          const staff = staffList.find(s => s.name === selectedStaff);
          if (staff) {
            params.staff_id = staff.staff_id;
          } else {
            if (isCurrent) {
              setSummaryData(null);
              setIsLoading(false);
            }
            return; 
          }
        } else if (!selectedStaff) {
          if (isCurrent) setIsLoading(false);
          return; 
        }
        
        if (selectedRule !== 'All Rules') {
          const rule = rulesList.find(r => r.rule_name === selectedRule);
          if (rule) params.rule_id = rule.rule_id;
        }

        const res = await api.get('/api/incentives/summary', { params });
        if (isCurrent) {
          setSummaryData(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch summary data", err);
        if (isCurrent) setSummaryData(null);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    fetchSummary();
    
    return () => {
      isCurrent = false;
    };
  }, [selectedMonth, selectedStaff, selectedRule, staffList, rulesList]);



  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-[#FDFDFD] min-h-screen">
      {/* Dynamic Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide non-report elements */
          #sidebar-container, nav, aside, .no-print, button, .relative.z-50 { display: none !important; }
          
          /* Reset layout for full page width */
          main, .max-w-7xl { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          body { background: white !important; }
          .bg-\[\#FDFDFD\] { background: white !important; }
          
          /* Ensure charts and cards look clean */
          .rounded-3xl, .rounded-2xl { border-radius: 12px !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
          
          /* Prevent page breaks inside cards */
          .bg-white { break-inside: avoid; }
        }
      `}} />

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Incentive Summary</h1>
          <p className="text-slate-500 mt-1">Historical commission results by staff and transaction</p>
        </div>
        {selectedStaff && selectedStaff !== 'All Staff' && (
          <div className="relative z-50">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center space-x-2 px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm group"
            >
              <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              <span>Export</span>
              <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform", isExportOpen && "rotate-180")} />
            </button>
            
            {isExportOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={handleExportExcel}
                  className="w-full text-left flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-slate-700 border-b border-slate-50 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <span className="text-emerald-600">📊</span>
                    <span>Excel (.xlsx)</span>
                </button>
                <button 
                  onClick={handleExportPdf}
                  className="w-full text-left flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors mt-1"
                  >
                    <span className="text-rose-500">📄</span>
                    <span>PDF Document</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        {/* Month Filter */}
        <div className="relative">
          <button 
            onClick={() => setIsMonthOpen(!isMonthOpen)}
            className="flex items-center space-x-3 px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-300 hover:shadow-md transition-all text-sm min-w-[180px] justify-between group"
          >
            <div className="flex items-center space-x-3">
              <Calendar className="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-500" />
              <span className="font-bold text-[#1E293B]">{selectedMonth}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform", isMonthOpen && "rotate-180")} />
          </button>
          
              {isMonthOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {availableMonths.map(m => (
                    <button 
                      key={m}
                      onClick={() => { setSelectedMonth(m); setIsMonthOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
        </div>

        {/* Staff Filter */}
        <div className="relative">
          <button 
            onClick={() => setIsStaffOpen(!isStaffOpen)}
            className="flex items-center space-x-3 px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-300 hover:shadow-md transition-all text-sm min-w-[180px] justify-between group"
          >
            <span className="font-bold text-[#1E293B]">{selectedStaff || 'Select Staff'}</span>
            <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform", isStaffOpen && "rotate-180")} />
          </button>

          {isStaffOpen && (
            <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                onClick={() => { setSelectedStaff('All Staff'); setIsStaffOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-900 border-b border-slate-50 mb-1 hover:bg-slate-50 rounded-xl transition-colors"
              >
                All Staff
              </button>
              {staffList.map(s => (
                <button 
                  key={s.staff_id}
                  onClick={() => { setSelectedStaff(s.name); setIsStaffOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedStaff && selectedStaff !== 'All Staff' && (
        <div className="flex items-center">
          <button 
            onClick={() => setSelectedStaff('All Staff')}
            className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-xs font-bold text-slate-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="uppercase tracking-wider">Back to List</span>
          </button>
        </div>
      )}

      <div id="pdf-content-area" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            {selectedStaff === 'All Staff' ? 'Leaderboard' : `Hello, ${selectedStaff ? selectedStaff.split(' ')[0] : 'there'}`}
          </h2>
          <p className="text-slate-500">Here is your Commission Overview for {selectedMonth}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Filters moved to table header inside StaffPerformancePage */}
          {summaryData && summaryData.monthStatus && (
            <div className={cn(
              "px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-500 border",
              summaryData.monthStatus.isPast 
                ? "bg-[#FCF5E5] text-[#854D0E] border-[#FDE68A]" 
                : summaryData.monthStatus.isFuture
                ? "bg-blue-50 text-blue-600 border-blue-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-100"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                summaryData.monthStatus.isPast ? "bg-[#854D0E]/10" : 
                summaryData.monthStatus.isFuture ? "bg-blue-500/10" : "bg-emerald-500/10"
              )}>
                <Calendar className={
                  summaryData.monthStatus.isPast ? "text-[#854D0E]" : 
                  summaryData.monthStatus.isFuture ? "text-blue-500" : "text-emerald-500"
                } size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">Month Status</p>
                <p className="text-[13px] font-black leading-none">
                  {summaryData.monthStatus.isPast ? "Month Over" : 
                   summaryData.monthStatus.isFuture ? "Not Started" :
                   `${summaryData.monthStatus.daysRemaining} Days Left`}
                </p>
              </div>
            </div>
          )}

          {summaryData && summaryData.ruleName && selectedStaff !== 'All Staff' && (
            <div className="px-5 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-500">
              <div className="w-8 h-8 rounded-lg bg-[#D0A479]/10 flex items-center justify-center">
                <Coins className="text-[#D0A479]" size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Scheme</p>
                <p className="text-[13px] font-black text-slate-800 leading-none">{summaryData.ruleName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedStaff === 'All Staff' ? (
        <div className="animate-in fade-in duration-500 -mt-4">
           <StaffPerformance isEmbedded={true} onStaffClick={(name) => setSelectedStaff(name)} selectedMonth={selectedMonth} />
        </div>
      ) : isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
             <div className="w-12 h-12 border-4 border-[#D0A479] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-500 font-medium">Loading your performance summary...</p>
          </div>
        </div>
      ) : !summaryData ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center space-y-4 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                <Info size={32} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-900">No performance data found</h3>
                <p className="text-slate-500 max-w-xs">There are no records for the selected staff and period. Try changing your filters.</p>
             </div>
          </div>
        </div>
      ) : summaryData.targetNotAssigned ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center space-y-4 text-center">
             <div className="w-16 h-16 bg-[#FDF0EB] rounded-2xl flex items-center justify-center mx-auto text-[#D0A479]">
                <Target size={32} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-900">Target Not Assigned</h3>
                <p className="text-slate-500 max-w-xs text-sm mt-1">No monthly target has been assigned to this staff member for {selectedMonth}. Please assign one from the Targets menu.</p>
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
          
          {/* Left Column - Summary Cards & Stats */}
          <div className="lg:col-span-4 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              {summaryData.summaryCards.map((card: any, idx: number) => (
                <div key={idx} className={cn("p-4 rounded-2xl shadow-sm border border-black/5 flex flex-col justify-center items-center text-center", card.color)}>
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-1">{card.label}</p>
                  <h3 className={cn("text-xl font-black", card.valColor)}>{card.value}</h3>
                </div>
              ))}
            </div>

            {/* Progress to Target Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Progress to Target</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900">{summaryData.progress.percentage}% Achieved</span>
                  <span className="text-slate-400">{summaryData.summaryCards[0].value.startsWith('$') ? '$' : ''}{summaryData.progress.remaining.toLocaleString('en-US')} Remaining</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#D0A479] rounded-full transition-all duration-1000" 
                    style={{ width: `${summaryData.progress.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Current Run Rate</p>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-lg font-bold text-slate-900">{summaryData.summaryCards[0].value.startsWith('$') ? '$' : ''}{summaryData.progress.currentRunRate.toLocaleString('en-US')}</span>
                    <span className="text-[10px] font-bold text-slate-500">/day</span>
                  </div>
                  <div className="flex items-center space-x-1 mt-1">
                    <div className={cn("w-1 h-1 rounded-full", summaryData.progress.status === 'Behind Target' ? "bg-rose-500" : "bg-emerald-500")}></div>
                    <span className={cn("text-[10px] font-bold uppercase", summaryData.progress.status === 'Behind Target' ? "text-rose-500" : "text-emerald-500")}>
                      {summaryData.progress.status}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Req. Run Rate</p>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-lg font-bold text-slate-900">{summaryData.summaryCards[0].value.startsWith('$') ? '$' : ''}{summaryData.progress.reqRunRate.toLocaleString('en-US')}</span>
                    <span className="text-[10px] font-bold text-slate-500">/day</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Trend Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900">Sales Trend</h3>
              <div className="h-48 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <LineChart data={summaryData.salesTrend}>
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#7C3AED" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#7C3AED', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between px-2">
                 {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31].map(d => (
                   <span key={d} className="text-[9px] font-bold text-slate-400">{d}</span>
                 ))}
              </div>
            </div>
          </div>

          {/* Right Column - Table & Detailed Progress */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Tier-wise Progress Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="font-bold text-slate-900">Tier-wise Progress Table</h3>
                <p className="text-xs text-slate-400 mt-1">Track individual gap progression towards upcoming tiers.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#0D4428] text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Tier</th>
                      <th className="px-6 py-4">{summaryData.isTargetPct ? 'Range (%)' : summaryData.isQuantity ? 'Quantity Range' : 'Amount Range'}</th>
                      <th className="px-6 py-4">Target Gap</th>
                      <th className="px-6 py-4">Estimated Commission</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {summaryData.tierProgress.map((row: any) => (
                      <tr 
                        key={row.tier} 
                        className={cn(
                          "border-b border-slate-50 transition-colors",
                          row.status === 'Reached' ? "bg-[#7C3AED] text-white" : "hover:bg-slate-50"
                        )}
                      >
                        <td className="px-6 py-4">{row.tier}</td>
                        <td className={cn("px-6 py-4 font-bold text-slate-700", (row.status === 'Reached') ? "text-white" : "")}>
                          {row.range}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold",
                            (row.status === 'Reached') ? "bg-white/20 text-white font-black" : "text-slate-900"
                          )}>
                            {row.targetGap}
                          </span>
                        </td>
                        <td className={cn(
                          "px-6 py-4 font-black transition-all",
                          (row.status === 'Reached') ? "text-white" : "text-slate-900"
                        )}>
                          ${Math.floor(row.expectedCommission).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50">
                <p className="text-[10px] italic text-slate-500">Note: The Purple-Highlighted rows mark your reached tiers.</p>
              </div>
            </div>

            {/* Next Bracket Gauge */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 w-full">
                <h3 className="font-bold text-slate-900 mb-6 text-center md:text-left text-lg">Next Bracket: {summaryData.nextTier.label}</h3>
                <Gauge 
                  value={summaryData.nextTier.current} 
                  total={summaryData.nextTier.total} 
                  label={summaryData.nextTier.label} 
                  isQuantity={summaryData.isQuantity}
                />
              </div>
              <div className="flex-1 w-full space-y-6">
                <div className="p-8 bg-emerald-50/50 border border-emerald-100/50 rounded-[2rem] text-center space-y-4">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Trophy className="text-emerald-500" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-600">Progress to Next Tier</p>
                    <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                      You need <span className="font-bold text-slate-900">
                        {summaryData.summaryCards[0].value.startsWith('$') ? `$${summaryData.nextTier.left.toLocaleString()}` : `${summaryData.nextTier.left.toLocaleString()} units`}
                      </span> more to unlock <span className="text-emerald-600 font-bold">{summaryData.nextTier.potentialCommission}</span> commission rate.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</p>
                    <p className="text-xl font-bold text-slate-900">{summaryData.summaryCards[0].value.startsWith('$') ? '$' : ''}{summaryData.nextTier.current.toLocaleString('en-US')}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Required</p>
                    <p className="text-xl font-bold text-slate-900">{summaryData.summaryCards[0].value.startsWith('$') ? '$' : ''}{summaryData.nextTier.total.toLocaleString('en-US')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
