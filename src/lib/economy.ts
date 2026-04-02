import type { PaymentRecord } from "@/lib/api/payments";
import type { Teacher } from "@/lib/api/teachers";

export type IncomeType = "cuota" | "evento" | "manual" | "otro";
export type IncomeStatus = "paid" | "pending";

export interface EconomyIncomeRecord {
  id: string;
  date: string;
  type: IncomeType;
  student: string;
  amount: number;
  status: IncomeStatus;
}

export interface EconomyExpenseRecord {
  id: string;
  date: string;
  category: "profesor" | "herramientas" | "otros";
  description: string;
  amount: number;
}

export interface EconomyMonthSeriesPoint {
  key: string;
  label: string;
  ingresos: number;
  gastos: number;
}

export interface EconomySnapshot {
  monthlyIncome: number;
  previousMonthlyIncome: number;
  monthlyExpenses: number;
  previousMonthlyExpenses: number;
  monthlyBalance: number;
  breakdownIncome: {
    cuotas: number;
    eventos: number;
    otros: number;
  };
  breakdownExpense: {
    profesores: number;
    otros: number;
  };
  series: EconomyMonthSeriesPoint[];
  recommendations: string[];
  incomeRows: EconomyIncomeRecord[];
  expenseRows: EconomyExpenseRecord[];
}

const STORAGE_INCOMES_KEY = "nexa:economy:manual-incomes";
const STORAGE_EXPENSES_KEY = "nexa:economy:manual-expenses";

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return fallback;
  }
}

function getMonthKey(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const dt = new Date(year, (month || 1) - 1, 1);
  return dt.toLocaleString("es-ES", { month: "short" }).replace(".", "");
}

function buildMonthKeys(months: number): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(base.getMonth() - i);
    out.push(getMonthKey(d));
  }
  return out;
}

function isEventConcept(concept: string): boolean {
  return /event|evento|festival|show|gala/i.test(concept);
}

export function getManualIncomes(): EconomyIncomeRecord[] {
  if (typeof window === "undefined") return [];
  const rows = safeParse<EconomyIncomeRecord[]>(window.localStorage.getItem(STORAGE_INCOMES_KEY), []);
  return rows
    .filter((row) => row && row.id && row.date)
    .map((row) => ({
      ...row,
      student: row.student || "-",
      status: row.status === "pending" ? "pending" : "paid",
      type: row.type || "manual",
      amount: Number(row.amount) || 0,
    }));
}

export function getManualExpenses(): EconomyExpenseRecord[] {
  if (typeof window === "undefined") return [];
  const rows = safeParse<EconomyExpenseRecord[]>(window.localStorage.getItem(STORAGE_EXPENSES_KEY), []);
  return rows
    .filter((row) => row && row.id && row.date)
    .map((row) => ({
      ...row,
      category: row.category || "otros",
      description: row.description || "Gasto manual",
      amount: Number(row.amount) || 0,
    }));
}

export function addManualIncome(input: Omit<EconomyIncomeRecord, "id">): EconomyIncomeRecord {
  const next: EconomyIncomeRecord = {
    id: crypto.randomUUID(),
    date: input.date || nowIsoDate(),
    type: input.type || "manual",
    student: input.student || "-",
    amount: Number(input.amount) || 0,
    status: input.status === "pending" ? "pending" : "paid",
  };

  const rows = getManualIncomes();
  const updated = [next, ...rows];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_INCOMES_KEY, JSON.stringify(updated));
  }

  return next;
}

export function addManualExpense(input: Omit<EconomyExpenseRecord, "id">): EconomyExpenseRecord {
  const next: EconomyExpenseRecord = {
    id: crypto.randomUUID(),
    date: input.date || nowIsoDate(),
    category: input.category || "otros",
    description: input.description || "Gasto manual",
    amount: Number(input.amount) || 0,
  };

  const rows = getManualExpenses();
  const updated = [next, ...rows];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(updated));
  }

  return next;
}

function buildIncomeRows(payments: PaymentRecord[], manualIncomes: EconomyIncomeRecord[]): EconomyIncomeRecord[] {
  const paymentRows: EconomyIncomeRecord[] = payments.map((payment) => {
    const date = payment.paidAt || payment.date || payment.createdAt || nowIsoDate();
    const amount = Number(payment.amount) || 0;
    const type: IncomeType = isEventConcept(payment.concept || "") ? "evento" : "cuota";
    const status: IncomeStatus = payment.status === "paid" ? "paid" : "pending";
    return {
      id: `payment-${payment.id}`,
      date,
      type,
      student: payment.studentName || "-",
      amount,
      status,
    };
  });

  return [...manualIncomes, ...paymentRows].sort((a, b) => b.date.localeCompare(a.date));
}

function buildExpenseRows(teachers: Teacher[], manualExpenses: EconomyExpenseRecord[]): EconomyExpenseRecord[] {
  const currentMonthDate = `${nowIsoDate().slice(0, 7)}-01`;
  const teacherRows: EconomyExpenseRecord[] = teachers
    .filter((teacher) => teacher.status === "active")
    .map((teacher) => ({
      id: `teacher-${teacher.id}`,
      date: currentMonthDate,
      category: "profesor",
      description: `Salario ${teacher.name}`,
      amount: Number((teacher as { salay?: number; aulary?: number }).salay ?? (teacher as { salay?: number; aulary?: number }).aulary ?? 0) || 0,
    }));

  return [...manualExpenses, ...teacherRows].sort((a, b) => b.date.localeCompare(a.date));
}

function sumByMonth(rows: Array<{ date: string; amount: number }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const month = getMonthKey(row.date);
    map[month] = (map[month] || 0) + (Number(row.amount) || 0);
  }
  return map;
}

function recommendations(snapshot: {
  monthlyIncome: number;
  previousMonthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
}): string[] {
  const tips: string[] = [];
  const incomeGrowth = snapshot.previousMonthlyIncome > 0
    ? ((snapshot.monthlyIncome - snapshot.previousMonthlyIncome) / snapshot.previousMonthlyIncome) * 100
    : 0;

  if (snapshot.monthlyBalance < 0) {
    tips.push("Mes en negativo: revisa gastos manuales y prioriza cobro de cuotas pendientes.");
  } else {
    tips.push("Balance positivo: mantén este margen para cubrir meses con menor ocupación.");
  }

  if (snapshot.monthlyIncome > 0 && snapshot.monthlyExpenses / snapshot.monthlyIncome > 0.6) {
    tips.push("Tus gastos en profesores superan el 60% de ingresos: optimiza grupos y horarios.");
  } else {
    tips.push("La relación ingresos/gastos está saludable: tienes margen para crecer.");
  }

  if (incomeGrowth >= 10) {
    tips.push(`Ingresos al alza: +${incomeGrowth.toFixed(0)}% vs mes anterior.`);
  } else if (incomeGrowth <= -10) {
    tips.push(`Atención: ingresos a la baja (${incomeGrowth.toFixed(0)}% vs mes anterior).`);
  } else {
    tips.push("Ingresos estables: evalúa campañas o eventos para mejorar crecimiento.");
  }

  return tips.slice(0, 4);
}

export function buildEconomySnapshot(params: {
  payments: PaymentRecord[];
  teachers: Teacher[];
  months: number;
  manualIncomes?: EconomyIncomeRecord[];
  manualExpenses?: EconomyExpenseRecord[];
}): EconomySnapshot {
  const manualIncomes = params.manualIncomes ?? getManualIncomes();
  const manualExpenses = params.manualExpenses ?? getManualExpenses();

  const incomeRows = buildIncomeRows(params.payments || [], manualIncomes);
  const expenseRows = buildExpenseRows(params.teachers || [], manualExpenses);

  const months = Math.max(2, params.months || 6);
  const monthKeys = buildMonthKeys(months);

  const incomePaidRows = incomeRows.filter((row) => row.status === "paid");
  const incomeByMonth = sumByMonth(incomePaidRows);
  const expensesByMonth = sumByMonth(expenseRows);

  const series: EconomyMonthSeriesPoint[] = monthKeys.map((key) => ({
    key,
    label: getMonthLabel(key),
    ingresos: Math.round(incomeByMonth[key] || 0),
    gastos: Math.round(expensesByMonth[key] || 0),
  }));

  const current = series[series.length - 1] || { ingresos: 0, gastos: 0 };
  const prev = series[series.length - 2] || { ingresos: 0, gastos: 0 };

  const currentMonthKey = monthKeys[monthKeys.length - 1];
  const monthlyIncomeRows = incomeRows.filter((row) => getMonthKey(row.date) === currentMonthKey);
  const monthlyExpenseRows = expenseRows.filter((row) => getMonthKey(row.date) === currentMonthKey);

  const breakdownIncome = {
    cuotas: monthlyIncomeRows.filter((row) => row.status === "paid" && row.type === "cuota").reduce((sum, row) => sum + row.amount, 0),
    eventos: monthlyIncomeRows.filter((row) => row.status === "paid" && row.type === "evento").reduce((sum, row) => sum + row.amount, 0),
    otros: monthlyIncomeRows.filter((row) => row.status === "paid" && (row.type === "manual" || row.type === "otro")).reduce((sum, row) => sum + row.amount, 0),
  };

  const breakdownExpense = {
    profesores: monthlyExpenseRows.filter((row) => row.category === "profesor").reduce((sum, row) => sum + row.amount, 0),
    otros: monthlyExpenseRows.filter((row) => row.category !== "profesor").reduce((sum, row) => sum + row.amount, 0),
  };

  const monthlyIncome = current.ingresos;
  const previousMonthlyIncome = prev.ingresos;
  const monthlyExpenses = current.gastos;
  const previousMonthlyExpenses = prev.gastos;
  const monthlyBalance = monthlyIncome - monthlyExpenses;

  return {
    monthlyIncome,
    previousMonthlyIncome,
    monthlyExpenses,
    previousMonthlyExpenses,
    monthlyBalance,
    breakdownIncome,
    breakdownExpense,
    series,
    recommendations: recommendations({
      monthlyIncome,
      previousMonthlyIncome,
      monthlyExpenses,
      monthlyBalance,
    }),
    incomeRows,
    expenseRows,
  };
}
