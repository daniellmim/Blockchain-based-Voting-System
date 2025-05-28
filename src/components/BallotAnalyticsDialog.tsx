"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { BarChartHorizontalBig } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getResultsFromBlockchain } from "@/lib/blockchainApi";
import { ChartContainer } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface BallotAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ballotTitle: string;
  roomId: string;
  ballotId: string;
  choices: Array<{ id: string; text: string }>; // Add choices prop
}

export function BallotAnalyticsDialog({
  open,
  onOpenChange,
  ballotTitle,
  roomId,
  ballotId,
  choices, // Use choices prop
}: BallotAnalyticsDialogProps) {
  const [blockchainResults, setBlockchainResults] = useState<any>(null);
  const [blockchainLedger, setBlockchainLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  // Fetch the full blockchain ledger for this room
  const fetchLedger = async () => {
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const res = await axios.get(
        `http://localhost:8080/api/ledger?roomId=${roomId}`
      );
      setBlockchainLedger(res.data);
    } catch (err: any) {
      setLedgerError(err.message || "Failed to fetch blockchain ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  // Fetch blockchain results (vote counts)
  const handleShowBlockchainResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await getResultsFromBlockchain(roomId, ballotId);
      setBlockchainResults(results);
      await fetchLedger();
    } catch (err: any) {
      setError(err.message || "Failed to fetch blockchain results");
    } finally {
      setLoading(false);
    }
  };

  // Map choiceId to choice text for the summary table and graph
  const getChoiceSummary = () => {
    if (!blockchainResults) return [];
    const safeChoices = Array.isArray(choices) ? choices : [];
    return Object.keys(blockchainResults).map((id, idx) => {
      const found = safeChoices.find((c) => c.id === id);
      return {
        id,
        text: found ? found.text : `Unknown Choice (${id})`,
        count: blockchainResults[id] || 0,
        index: idx + 1,
      };
    });
  };

  // Helper: generate a color palette for choices
  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "#8e44ad", // fallback purple
    "#e67e22", // fallback orange
    "#16a085", // fallback teal
    "#c0392b", // fallback red
    "#2980b9", // fallback blue
  ];

  // Poll blockchain results and ledger for live analytics
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (open) {
      const fetchAll = async () => {
        try {
          const results = await getResultsFromBlockchain(roomId, ballotId);
          setBlockchainResults(results);
          const res = await axios.get(
            `http://localhost:8080/api/ledger?roomId=${roomId}`
          );
          setBlockchainLedger(res.data);
        } catch (err: any) {
          setError(err.message || "Failed to fetch blockchain results");
        }
      };
      fetchAll();
      interval = setInterval(fetchAll, 2000); // Poll every 4 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open, roomId, ballotId]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <BarChartHorizontalBig className="h-6 w-6 text-primary" />
            <AlertDialogTitle>Analytics: {ballotTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Blockchain-based voting analytics for this ballot. All data below is
            fetched directly from the blockchain node for full transparency.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          {/* Results Summary Table */}
          {blockchainResults && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">
                Vote Summary (from Blockchain)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="px-2 py-1 border">#</th>
                      <th className="px-2 py-1 border">Choice ID</th>
                      <th className="px-2 py-1 border">Vote Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getChoiceSummary().map((row) => (
                      <tr key={row.id}>
                        <td className="px-2 py-1 border text-center">
                          {row.index}
                        </td>
                        <td className="px-2 py-1 border font-mono">{row.id}</td>
                        <td className="px-2 py-1 border text-center">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Blockchain Ledger */}
          {blockchainLedger.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">
                Full Blockchain Ledger (Room)
              </h4>
              <div className="overflow-x-auto max-h-64">
                <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto max-h-60 mb-2">
                  {JSON.stringify(blockchainLedger, null, 2)}
                </pre>
              </div>
            </div>
          )}
          {error && <p className="text-destructive text-sm mb-2">{error}</p>}
          {ledgerError && (
            <p className="text-destructive text-sm mb-2">{ledgerError}</p>
          )}
          {/* Show Blockchain Analytics Button (only if analytics not showing) */}
          {!blockchainResults && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleShowBlockchainResults}
              disabled={loading || ledgerLoading}
            >
              {loading || ledgerLoading
                ? "Loading Blockchain Analytics..."
                : "Show Blockchain Analytics"}
            </Button>
          )}
          {/* Results Graph - AreaChart (prettier, choice labels) */}
          {blockchainResults && getChoiceSummary().length > 0 && (
            <div className="mb-6 mt-8">
              <h4 className="font-semibold mb-2">Vote Distribution (Graph)</h4>
              <div className="w-full max-w-lg mx-auto h-80 bg-slate-50 dark:bg-slate-900 rounded-lg shadow-inner p-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={getChoiceSummary()}
                    margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                  >
                    <XAxis
                      dataKey="index"
                      tickFormatter={(idx) => `Choice ${idx}`}
                      tick={{ fontSize: 13 }}
                      label={{
                        value: "Choice",
                        position: "insideBottom",
                        offset: -5,
                      }}
                    />
                    <YAxis
                      dataKey="count"
                      allowDecimals={false}
                      label={{
                        value: "Vote Count",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [value, "Votes"]}
                      labelFormatter={(label) => `Choice ${label}`}
                    />
                    <defs>
                      {getChoiceSummary().map((entry, idx) => (
                        <linearGradient
                          id={`colorVotes${idx}`}
                          key={entry.id}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={chartColors[idx % chartColors.length]}
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor={chartColors[idx % chartColors.length]}
                            stopOpacity={0.2}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    {getChoiceSummary().map((entry, idx) => (
                      <Area
                        key={entry.id}
                        type="monotone"
                        dataKey="count"
                        stroke={chartColors[idx % chartColors.length]}
                        fill={`url(#colorVotes${idx})`}
                        isAnimationActive={true}
                        dot={{
                          r: 5,
                          stroke: chartColors[idx % chartColors.length],
                          strokeWidth: 2,
                          fill: "#fff",
                        }}
                        activeDot={{ r: 7 }}
                        name={`Choice ${entry.index}`}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
                {/* Legend for color mapping */}
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {getChoiceSummary().map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-1 text-xs"
                    >
                      <span
                        style={{
                          background: chartColors[idx % chartColors.length],
                          width: 14,
                          height: 14,
                          display: "inline-block",
                          borderRadius: 3,
                          marginRight: 4,
                        }}
                      />
                      <span>Choice {entry.index}</span>
                      <span className="text-muted-foreground">
                        ({entry.id.slice(0, 6)}...)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
