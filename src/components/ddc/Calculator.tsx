import { useState } from 'react';
import { Search, Sparkles, AlertCircle, Trash2, ChevronDown } from 'lucide-react';
import { extractDomains } from '@/lib/ddc/domainExtractor';
import { calculateSavings } from '@/lib/ddc/calculator';
import type { SavingsResult, TimeFrame } from '@/types/ddc';
import { ResultsCards } from './ResultsCards';
import { BreakdownTable } from './BreakdownTable';

export function Calculator() {
  const [input, setInput] = useState('');
  const [presetTimeFrame, setPresetTimeFrame] = useState<TimeFrame>(1);
  const [customTimeFrame, setCustomTimeFrame] = useState<TimeFrame | null>(null);
  const [results, setResults] = useState<SavingsResult | null>(null);
  const [extractedCount, setExtractedCount] = useState(0);
  const timeFrame: TimeFrame = customTimeFrame ?? presetTimeFrame;

  const presetYearOptions: TimeFrame[] = [1, 5, 10];
  const customYearOptions: TimeFrame[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handlePresetTimeFrameSelect = (years: TimeFrame) => {
    setPresetTimeFrame(years);
    setCustomTimeFrame(null);
  };

  const handleCustomTimeFrameChange = (value: string) => {
    if (!value) {
      setCustomTimeFrame(null);
      return;
    }

    setCustomTimeFrame(Number(value) as TimeFrame);
  };

  const handleCalculate = () => {
    const domains = extractDomains(input);
    setExtractedCount(domains.length);

    if (domains.length === 0) {
      setResults(null);
      return;
    }

    const savings = calculateSavings(domains, timeFrame);
    setResults(savings);
  };

  const handleExtract = () => {
    const domains = extractDomains(input);
    setExtractedCount(domains.length);

    if (domains.length > 0) {
      // Show extracted domains in textarea
      const domainList = domains.map((d) => d.full).join('\n');
      setInput(domainList);
    }
  };

  const handleClear = () => {
    setInput('');
    setResults(null);
    setExtractedCount(0);
  };

  return (
    <div className="w-full space-y-8">
      {/* Input Section */}
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Enter Your Domains
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Paste any text containing domains - we'll extract them automatically
            </p>
          </div>
          {extractedCount > 0 && (
            <div className="px-4 py-2 rounded-full bg-muted border border-border">
              <span className="text-sm font-semibold text-foreground">
                {extractedCount} domain{extractedCount !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Paste your domains here (any format works):\n\nexample.com\nhttps://mysite.net\nwww.business.org\n\nOr paste entire paragraphs, spreadsheets, or lists!`}
          className="w-full h-64 px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground"
        />

        {/* Time Frame Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Calculate savings for:
          </label>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="grid flex-1 grid-cols-3 gap-3">
              {presetYearOptions.map((years) => (
                <button
                  key={years}
                  onClick={() => handlePresetTimeFrameSelect(years)}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    customTimeFrame === null && timeFrame === years
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                  }`}
                >
                  {years} Year{years !== 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-52">
              <select
                value={customTimeFrame ?? ''}
                onChange={(e) => handleCustomTimeFrameChange(e.target.value)}
                className={`w-full appearance-none px-4 py-3 pr-10 rounded-lg border text-center text-sm font-semibold tracking-tight transition-all duration-200 ${
                  customTimeFrame !== null
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-lg'
                    : 'bg-muted text-foreground hover:bg-muted/80 border-border'
                }`}
              >
                <option value="" className="bg-background text-foreground text-center">
                  Custom
                </option>
                {customYearOptions.map((years) => (
                  <option key={years} value={years} className="bg-background text-foreground text-center">
                    {years} Year{years !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  customTimeFrame !== null ? 'text-white/90' : 'text-muted-foreground'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={!input.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            <Search className="w-5 h-5" />
            Calculate Savings
          </button>

          <button
            onClick={handleExtract}
            disabled={!input.trim()}
            className="px-6 py-4 bg-card border border-border text-foreground rounded-lg font-semibold hover:bg-muted disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Extract
          </button>

          <button
            onClick={handleClear}
            disabled={!input.trim() && !results}
            className="px-6 py-4 bg-card border border-border text-foreground rounded-lg font-semibold hover:bg-muted disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Clear
          </button>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="space-y-6 px-8 pb-8">
          {/* Unsupported Extensions Warning */}
          {results.unsupportedDomains > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground mb-2">
                    {results.unsupportedDomains} Unsupported Extension{results.unsupportedDomains > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {results.unsupportedDomains} domain{results.unsupportedDomains > 1 ? 's' : ''} with unsupported extensions {results.unsupportedDomains > 1 ? 'were' : 'was'} excluded from calculations.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {results.domains
                      .filter((d) => !d.supported)
                      .map((domain, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-semibold rounded-full border border-yellow-500/30"
                        >
                          {domain.full} ({domain.extension})
                        </span>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We currently support {results.supportedDomains} popular TLDs. HostingInfo's DDC covers 555+ extensions.
                  </p>
                </div>
              </div>
            </div>
          )}

          <ResultsCards results={results} timeFrame={timeFrame} />
          <BreakdownTable results={results} timeFrame={timeFrame} />
        </div>
      )}
    </div>
  );
}
