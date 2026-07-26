"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Activity, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import toast from "react-hot-toast";

type Transaction = {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
};

const EXPENSE_COLORS: Record<string, string> = {
  MATERIALS: "#ef4444", // red-500
  CONTRACTOR_PAYMENT: "#f97316", // orange-500
  INSURANCE: "#eab308", // yellow-500
  COMPLIANCE: "#3b82f6", // blue-500
  STAFF_PAYMENT: "#8b5cf6", // violet-500
  SUBSCRIPTION: "#ec4899", // pink-500
  MISC: "#64748b", // slate-500
};

export default function ProfitLossPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  useEffect(() => {
    fetchData();
  }, [year]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/transactions?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      } else {
        toast.error("Failed to load financial data");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred loading financials");
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals
  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : "0.0";

  // Aggregate expenses by category for pie chart
  const expenseByCategory = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name: name.replace("_", " "),
    value,
    color: EXPENSE_COLORS[name] || "#94a3b8"
  })).sort((a, b) => b.value - a.value);

  // Aggregate by month for bar chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = months.map(month => ({ month, income: 0, expenses: 0, profit: 0 }));

  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthIndex = date.getMonth(); // 0-11
    
    if (t.type === "INCOME") {
      monthlyData[monthIndex].income += t.amount;
    } else {
      monthlyData[monthIndex].expenses += t.amount;
    }
    monthlyData[monthIndex].profit = monthlyData[monthIndex].income - monthlyData[monthIndex].expenses;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "ACCOUNTANT") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted">Access Denied</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Report</h1>
          <p className="text-text-muted mt-1">Financial overview and expense breakdown.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Select 
              value={year} 
              onChange={(e) => setYear(e.target.value)}
              options={[
                { value: "2026", label: "2026" },
                { value: "2025", label: "2025" },
                { value: "2024", label: "2024" }
              ]}
            />
          </div>
          
          <Button variant="outline" className="gap-2 bg-surface">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-surface shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted flex items-center justify-between">
              Gross Income
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 pt-0">
            <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(totalIncome)}</div>
            <p className="text-xs text-text-muted mt-1">Total revenue generated</p>
          </div>
        </Card>
        
        <Card className="bg-surface shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted flex items-center justify-between">
              Total Expenses
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 pt-0">
            <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-text-muted mt-1">All categorized costs</p>
          </div>
        </Card>

        <Card className="bg-surface shadow-sm border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted flex items-center justify-between">
              Net Profit
              <Activity className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 pt-0">
            <div className={cn("text-2xl font-bold", netProfit < 0 ? "text-rose-500" : "text-emerald-500")}>
              {loading ? "..." : formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-text-muted mt-1">After all expenses</p>
          </div>
        </Card>

        <Card className="bg-surface shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted flex items-center justify-between">
              Profit Margin
              <PieChartIcon className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 pt-0">
            <div className="text-2xl font-bold">{loading ? "..." : `${profitMargin}%`}</div>
            <p className="text-xs text-text-muted mt-1">Net profit relative to income</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <Card className="bg-surface shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Performance</CardTitle>
            <p className="text-sm text-text-muted">Income vs Expenses over the year</p>
          </CardHeader>
          <div className="px-6 pb-6 pt-0">
            <div className="h-[350px] w-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} />
                    <RechartsTooltip 
                      formatter={(value: any) => formatCurrency(value as number)}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Card>

        {/* Expense Breakdown Pie Chart */}
        <Card className="bg-surface shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
            <p className="text-sm text-text-muted">Where costs are allocated</p>
          </CardHeader>
          <div className="px-6 pb-6 pt-0">
            <div className="h-[250px] w-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">Loading...</div>
              ) : pieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-text-muted">No expenses recorded</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => formatCurrency(value as number)}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm capitalize">{item.name.toLowerCase()}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      
      {/* Recent Transactions List */}
      <Card className="bg-surface shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Ledger Entries</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-muted uppercase border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-text-muted">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-text-muted">No transactions found for this year.</td></tr>
                ) : (
                  transactions.slice(0, 10).map((t) => (
                    <tr key={t.id} className="border-b border-border-subtle/50 hover:bg-surface-hover/30">
                      <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn(
                          "uppercase text-[10px]",
                          t.type === "INCOME" ? "border-emerald-500/30 text-emerald-500" : "border-rose-500/30 text-rose-500"
                        )}>
                          {t.category.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary truncate max-w-xs">
                        {t.description || "—"}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-medium whitespace-nowrap",
                        t.type === "INCOME" ? "text-emerald-500" : "text-text-primary"
                      )}>
                        {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Utility to combine Tailwind classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
