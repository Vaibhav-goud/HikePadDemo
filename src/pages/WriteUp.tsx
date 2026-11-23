import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  fetchUniversities,
  fetchCourses,
  fetchPaymentTypes,
  fetchLoanPartners,
  fetchOfferCards,
  OfferSummary,
  OfferCard
} from '@/lib/writeUpApi';
import {
  Building2,
  GraduationCap,
  CreditCard,
  Landmark,
  RefreshCw,
  Copy,
  Check,
  Search,
  Grid,
  Table as TableIcon,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  Banknote,
  Percent,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function WriteUp() {
  // Filter States
  const [universities, setUniversities] = useState<string[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [paymentTypes, setPaymentTypes] = useState<string[]>(['All']);
  const [selectedPayment, setSelectedPayment] = useState<string>('All');
  const [loanPartners, setLoanPartners] = useState<string[]>(['All']);
  const [selectedLoan, setSelectedLoan] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View Mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Data States
  const [summary, setSummary] = useState<OfferSummary | null>(null);
  const [offers, setOffers] = useState<OfferCard[]>([]);
  
  // Loading States
  const [isLoadingUniversities, setIsLoadingUniversities] = useState<boolean>(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState<boolean>(false);
  const [isCopiedSummary, setIsCopiedSummary] = useState<boolean>(false);
  const [copiedCardIndex, setCopiedCardIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial load: Fetch universities
  useEffect(() => {
    async function loadUniversities() {
      setIsLoadingUniversities(true);
      setErrorMsg(null);
      try {
        const univs = await fetchUniversities();
        setUniversities(univs);
        if (univs.length > 0) {
          setSelectedUniversity(univs[0]);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to load universities from Web App backend.');
      } finally {
        setIsLoadingUniversities(false);
      }
    }
    loadUniversities();
  }, []);

  // When University changes -> Load Courses
  useEffect(() => {
    if (!selectedUniversity) {
      setCourses([]);
      setSelectedCourse('');
      return;
    }

    async function loadCourses() {
      setIsLoadingCourses(true);
      setErrorMsg(null);
      try {
        const crs = await fetchCourses(selectedUniversity);
        setCourses(crs);
        if (crs.length > 0) {
          setSelectedCourse(crs[0]);
        } else {
          setSelectedCourse('');
          setSummary(null);
          setOffers([]);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(`Failed to load courses for ${selectedUniversity}.`);
      } finally {
        setIsLoadingCourses(false);
      }
    }

    loadCourses();
  }, [selectedUniversity]);

  // When University or Course changes -> Load Payment Types & Loan Partners
  useEffect(() => {
    if (!selectedUniversity || !selectedCourse) return;

    async function loadMetaFilters() {
      try {
        const [pts, lps] = await Promise.all([
          fetchPaymentTypes(selectedUniversity, selectedCourse),
          fetchLoanPartners(selectedUniversity, selectedCourse, selectedPayment)
        ]);
        setPaymentTypes(pts.length > 0 ? pts : ['All']);
        setLoanPartners(lps.length > 0 ? lps : ['All']);
      } catch (err) {
        console.error(err);
      }
    }

    loadMetaFilters();
  }, [selectedUniversity, selectedCourse, selectedPayment]);

  // Load Offers when filters change
  const loadOffers = async () => {
    if (!selectedUniversity || !selectedCourse) return;
    setIsLoadingOffers(true);
    setErrorMsg(null);
    try {
      const res = await fetchOfferCards({
        university: selectedUniversity,
        course: selectedCourse,
        payment: selectedPayment,
        loan: selectedLoan
      });
      setSummary(res.summary);
      setOffers(res.offers);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to calculate offer options.');
      setSummary(null);
      setOffers([]);
    } finally {
      setIsLoadingOffers(false);
    }
  };

  useEffect(() => {
    if (selectedUniversity && selectedCourse) {
      loadOffers();
    }
  }, [selectedUniversity, selectedCourse, selectedPayment, selectedLoan]);

  // Client-side search filter across loaded offer cards
  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter(o =>
      o.header.toLowerCase().includes(q) ||
      o.partner.toLowerCase().includes(q) ||
      o.paymentType.toLowerCase().includes(q) ||
      (o.interestType && o.interestType.toLowerCase().includes(q)) ||
      (o.emi && o.emi.toLowerCase().includes(q))
    );
  }, [offers, searchQuery]);

  // Copy Full Summary Text to Clipboard
  const handleCopySummary = () => {
    if (!summary) return;
    let text = `🎓 *OFFER WRITE UP - ${selectedUniversity} (${selectedCourse})*\n`;
    text += `----------------------------------------\n`;
    text += `💰 Program Fee: ${summary.programFee}\n`;
    text += `📝 Registration Fee: ${summary.registrationFee}\n`;
    text += `🏷️ Discount: ${summary.discount}\n`;
    text += `✅ Final Payable: ${summary.finalPayable}\n\n`;
    text += `📋 *AVAILABLE PAYMENT / LOAN OPTIONS (${filteredOffers.length})*:\n`;

    filteredOffers.forEach((o, idx) => {
      text += `\n*Option ${idx + 1}: ${o.header}*\n`;
      if (o.isSelf) {
        text += `• Total Payable: ${o.totalPayable || summary.finalPayable}\n`;
        text += `• Payment Type: ${o.paymentType}\n`;
      } else {
        text += `• Monthly EMI: ${o.emi || 'N/A'}\n`;
        text += `• Down Payment: ${o.downPayment || 'N/A'}\n`;
        text += `• Interest Type: ${o.interestType || 'Standard'} (${o.interestPercent || '0%'})\n`;
        if (o.processingFee) text += `• Processing Fee: ${o.processingFee}\n`;
      }
    });

    navigator.clipboard.writeText(text);
    setIsCopiedSummary(true);
    toast.success('Complete offer write up copied to clipboard!');
    setTimeout(() => setIsCopiedSummary(false), 2500);
  };

  // Copy Specific Card to Clipboard
  const handleCopyCard = (offer: OfferCard, index: number) => {
    let text = `📌 *${selectedUniversity} - ${selectedCourse} | ${offer.header}*\n`;
    text += `----------------------------------------\n`;
    if (summary) {
      text += `Program Fee: ${summary.programFee}\n`;
      text += `Final Payable: ${summary.finalPayable}\n`;
    }
    if (offer.isSelf) {
      text += `Payment Type: ${offer.paymentType}\n`;
      text += `Total Payable: ${offer.totalPayable || (summary ? summary.finalPayable : 'N/A')}\n`;
    } else {
      text += `Monthly EMI: ${offer.emi}\n`;
      text += `Down Payment: ${offer.downPayment}\n`;
      text += `Interest Scheme: ${offer.interestType} (${offer.interestPercent})\n`;
      if (offer.processingFee) text += `Processing Fee: ${offer.processingFee}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedCardIndex(index);
    toast.success(`Copied details for ${offer.header}`);
    setTimeout(() => setCopiedCardIndex(null), 2500);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!summary || offers.length === 0) return;
    const headers = [
      'University',
      'Course',
      'Option',
      'Partner',
      'Payment Type',
      'Program Fee',
      'Registration Fee',
      'Discount',
      'Final Payable',
      'Monthly EMI',
      'Down Payment',
      'Interest Type',
      'Processing Fee'
    ];

    const csvRows = [headers.join(',')];

    offers.forEach(o => {
      const row = [
        `"${selectedUniversity}"`,
        `"${selectedCourse}"`,
        `"${o.header}"`,
        `"${o.partner}"`,
        `"${o.paymentType}"`,
        `"${summary.programFee}"`,
        `"${summary.registrationFee}"`,
        `"${summary.discount}"`,
        `"${summary.finalPayable}"`,
        `"${o.emi || (o.isSelf ? o.totalPayable : '')}"`,
        `"${o.downPayment || ''}"`,
        `"${o.interestType || ''}"`,
        `"${o.processingFee || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `WriteUp_${selectedUniversity}_${selectedCourse}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV downloaded successfully!');
  };

  return (
    <DashboardLayout
      title="Write up"
      subtitle="Interactive Google Apps Script Offer & Pricing Calculator"
    >
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        
        {/* Top Header Card with Actions */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-card via-card/90 to-card/60 p-6 md:p-8 border border-border/50 shadow-xl backdrop-blur-xl"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Offer & Pricing Write Up
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Live fee structures and flexible financing options powered by Apps Script Engine
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadOffers}
                disabled={isLoadingOffers || !selectedCourse}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/80 hover:bg-muted text-foreground font-medium text-sm border border-border/50 transition-all hover:shadow-md disabled:opacity-50"
                title="Refresh offer cards"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingOffers ? 'animate-spin text-primary' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleCopySummary}
                disabled={!summary || offers.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isCopiedSummary ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{isCopiedSummary ? 'Copied Write Up!' : 'Copy Summary'}</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={!summary || offers.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20 font-medium text-sm border border-emerald-500/30 transition-all disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filter Control Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl bg-card/80 border border-border/50 p-6 shadow-lg backdrop-blur-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              Filter Selection
            </h3>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                Cards View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                Table View
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* University Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                University
              </label>
              {isLoadingUniversities ? (
                <Skeleton className="h-10 w-full rounded-xl" />
              ) : (
                <select
                  value={selectedUniversity}
                  onChange={(e) => setSelectedUniversity(e.target.value)}
                  className="w-full h-10 px-3.5 py-2 rounded-xl bg-background border border-border/60 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                >
                  {universities.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Course Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                Course
              </label>
              {isLoadingCourses ? (
                <Skeleton className="h-10 w-full rounded-xl" />
              ) : (
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  disabled={courses.length === 0}
                  className="w-full h-10 px-3.5 py-2 rounded-xl bg-background border border-border/60 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Payment Type Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                Payment Type
              </label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                disabled={!selectedCourse}
                className="w-full h-10 px-3.5 py-2 rounded-xl bg-background border border-border/60 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 cursor-pointer"
              >
                {paymentTypes.map(p => (
                  <option key={p} value={p}>{p === 'All' ? 'All Payment Types' : p}</option>
                ))}
              </select>
            </div>

            {/* Loan Partner Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                Loan Partner
              </label>
              <select
                value={selectedLoan}
                onChange={(e) => setSelectedLoan(e.target.value)}
                disabled={!selectedCourse}
                className="w-full h-10 px-3.5 py-2 rounded-xl bg-background border border-border/60 text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loanPartners.map(l => (
                  <option key={l} value={l}>{l === 'All' ? 'All Loan Partners' : l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative pt-2">
            <Search className="absolute left-3.5 top-5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by tenure, partner, EMI amount, or interest scheme..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-background/80 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </motion.div>

        {/* Error Banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </motion.div>
        )}

        {/* Summary KPI Banner */}
        {isLoadingOffers ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : summary ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="p-5 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-md flex flex-col justify-between shadow-md hover:border-primary/40 transition-all">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-indigo-400" />
                Program Fee
              </span>
              <div className="mt-3">
                <div className="text-2xl font-black tracking-tight text-foreground">{summary.programFee}</div>
                <span className="text-xs text-muted-foreground">Standard Tuition</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-md flex flex-col justify-between shadow-md hover:border-primary/40 transition-all">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-blue-400" />
                Registration Fee
              </span>
              <div className="mt-3">
                <div className="text-2xl font-black tracking-tight text-foreground">{summary.registrationFee}</div>
                <span className="text-xs text-muted-foreground">Initial Deposit</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-md flex flex-col justify-between shadow-md hover:border-emerald-500/40 transition-all">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-emerald-400" />
                Scholarship / Discount
              </span>
              <div className="mt-3">
                <div className="text-2xl font-black tracking-tight text-emerald-400">{summary.discount}</div>
                <span className="text-xs text-muted-foreground">Applied Concession</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 via-card/80 to-card border border-primary/40 backdrop-blur-md flex flex-col justify-between shadow-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" />
                Final Net Payable
              </span>
              <div className="mt-3">
                <div className="text-2xl font-black tracking-tight text-primary">{summary.finalPayable}</div>
                <span className="text-xs text-muted-foreground">Total Course Amount</span>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Content Section: Offers Grid or Table */}
        <AnimatePresence mode="wait">
          {isLoadingOffers ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </motion.div>
          ) : filteredOffers.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 text-center rounded-2xl bg-card/40 border border-dashed border-border/60 backdrop-blur-md"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No Offers Found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                No active offer combinations matched your selected university, course, or filters. Try adjusting your query options.
              </p>
            </motion.div>
          ) : viewMode === 'cards' ? (
            <motion.div
              key="cards-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredOffers.map((offer, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.05 }}
                  className="group relative rounded-2xl bg-card/80 border border-border/60 hover:border-primary/50 p-6 shadow-lg hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 backdrop-blur-md flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition-all" />

                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        offer.isSelf
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-primary/10 text-primary border border-primary/30'
                      }`}>
                        {offer.isSelf ? 'Self Payment' : offer.partner || 'Loan Partner'}
                      </span>

                      <button
                        onClick={() => handleCopyCard(offer, idx)}
                        className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        title="Copy this offer card"
                      >
                        {copiedCardIndex === idx ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <h4 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {offer.header}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary/60" />
                      Payment Type: <strong className="text-foreground">{offer.paymentType}</strong>
                    </p>
                  </div>

                  {/* Card Detail Grid */}
                  <div className="mt-6 pt-4 border-t border-border/40 space-y-3">
                    {offer.isSelf ? (
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-muted-foreground">Total Payable</span>
                        <span className="font-bold text-lg text-foreground">
                          {offer.totalPayable || (summary ? summary.finalPayable : 'N/A')}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            Monthly EMI
                          </span>
                          <span className="text-lg font-black text-primary">
                            {offer.emi || 'N/A'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs py-1 border-t border-border/20">
                          <span className="text-muted-foreground">Down Payment</span>
                          <span className="font-semibold text-foreground">
                            {offer.downPayment || 'N/A'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs py-1 border-t border-border/20">
                          <span className="text-muted-foreground">Interest Scheme</span>
                          <span className="font-semibold text-foreground">
                            {offer.interestType || 'Standard'} ({offer.interestPercent || '0%'})
                          </span>
                        </div>

                        {offer.processingFee && (
                          <div className="flex justify-between items-center text-xs py-1 border-t border-border/20">
                            <span className="text-muted-foreground">Processing Fee</span>
                            <span className="font-semibold text-amber-400">
                              {offer.processingFee}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* Table View */
            <motion.div
              key="table-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-card/80 border border-border/60 shadow-xl backdrop-blur-md overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4">Option Card</th>
                      <th className="px-6 py-4">Partner</th>
                      <th className="px-6 py-4">Payment Type</th>
                      <th className="px-6 py-4">Monthly EMI</th>
                      <th className="px-6 py-4">Down Payment</th>
                      <th className="px-6 py-4">Interest Type</th>
                      <th className="px-6 py-4">Processing Fee</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredOffers.map((offer, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">
                          {offer.header}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            offer.isSelf ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'
                          }`}>
                            {offer.partner || 'Self'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {offer.paymentType}
                        </td>
                        <td className="px-6 py-4 font-extrabold text-primary">
                          {offer.isSelf ? offer.totalPayable || (summary ? summary.finalPayable : '-') : offer.emi || '-'}
                        </td>
                        <td className="px-6 py-4 text-foreground font-medium">
                          {offer.downPayment || '-'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {offer.interestType ? `${offer.interestType} (${offer.interestPercent})` : '-'}
                        </td>
                        <td className="px-6 py-4 text-amber-400 font-medium">
                          {offer.processingFee || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleCopyCard(offer, idx)}
                            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
                            title="Copy details"
                          >
                            {copiedCardIndex === idx ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
