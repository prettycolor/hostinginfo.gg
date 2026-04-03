import { CheckCircle, XCircle } from 'lucide-react';
import type { SavingsResult, TimeFrame } from '@/types/ddc';
import { formatCurrency } from '@/lib/ddc/calculator';

interface BreakdownTableProps {
  results: SavingsResult;
  timeFrame: TimeFrame;
}

export function BreakdownTable({ results, timeFrame }: BreakdownTableProps) {
  return (
    <div className="bg-card rounded-lg shadow-lg p-6 space-y-4 border border-border">
      <h2 className="text-2xl font-bold text-foreground">Domain Breakdown</h2>
      <p className="text-muted-foreground">
        Per-domain pricing for {timeFrame} year{timeFrame !== 1 ? 's' : ''}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-3 px-4 font-semibold text-foreground">Domain</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Extension</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">List Price</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">Basic</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">Premium</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">Pro</th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.domains.map((domain, index) => (
              <tr
                key={`${domain.full}-${index}`}
                className={`border-b border-border ${
                  !domain.supported ? 'bg-muted/50' : 'hover:bg-muted/50'
                }`}
              >
                <td className="py-3 px-4 font-mono text-sm text-foreground">{domain.name}</td>
                <td className="py-3 px-4 font-mono text-sm text-muted-foreground">
                  {domain.extension}
                </td>
                {domain.supported ? (
                  <>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {formatCurrency(domain.listPrice * timeFrame)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-foreground">{formatCurrency(domain.basicPrice * timeFrame)}</div>
                      <div className="text-xs text-green-500">
                        Save {formatCurrency(domain.basicSavings * timeFrame)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-foreground">{formatCurrency(domain.premiumPrice * timeFrame)}</div>
                      <div className="text-xs text-green-500">
                        Save {formatCurrency(domain.premiumSavings * timeFrame)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-foreground">{formatCurrency(domain.proPrice * timeFrame)}</div>
                      <div className="text-xs text-green-500">
                        Save {formatCurrency(domain.proSavings * timeFrame)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline-block" />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 text-right text-muted-foreground" colSpan={4}>
                      Extension not supported
                    </td>
                    <td className="py-3 px-4 text-center">
                      <XCircle className="w-5 h-5 text-muted-foreground inline-block" />
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      {results.unsupportedDomains > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
          <p className="text-sm text-foreground">
            <strong>{results.unsupportedDomains}</strong> domain
            {results.unsupportedDomains !== 1 ? 's' : ''} with unsupported extensions were
            excluded from calculations. Only the {results.supportedDomains} supported domain
            {results.supportedDomains !== 1 ? 's' : ''} are included in the savings totals.
          </p>
        </div>
      )}
    </div>
  );
}
