import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleHelpShortcut } from "@/components/layout/ModuleHelpShortcut";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, Loader2, Plus, RefreshCw, Wallet } from "lucide-react";
import { getPayments } from "@/lib/api/payments";
import { getTeachers } from "@/lib/api/teachers";
import {
  addManualExpense,
  addManualIncome,
  buildEconomySnapshot,
  getManualExpenses,
  getManualIncomes,
  type EconomyExpenseRecord,
  type EconomyIncomeRecord,
} from "@/lib/economy";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ECONOMY_TAB_KEY = "nexa:economy:tab";
const ECONOMY_PAYMENTS_CACHE_KEY = "nexa:economy:payments-cache";
const ECONOMY_TEACHERS_CACHE_KEY = "nexa:economy:teachers-cache";

function readStoredString(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
}

function readStoredArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function persistArray<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function euro(value: number) {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€`;
}

function pctDiff(current: number, previous: number) {
  if (previous <= 0) return "0%";
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`;
}

export default function EconomyPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const stored = readStoredString(ECONOMY_TAB_KEY);
    return stored === "resumen" || stored === "ingresos" || stored === "gastos" ? stored : "resumen";
  });
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getPayments>>>(() =>
    readStoredArray<Awaited<ReturnType<typeof getPayments>>[number]>(ECONOMY_PAYMENTS_CACHE_KEY)
  );
  const [teachers, setTeachers] = useState<Awaited<ReturnType<typeof getTeachers>>>(() =>
    readStoredArray<Awaited<ReturnType<typeof getTeachers>>[number]>(ECONOMY_TEACHERS_CACHE_KEY)
  );
  const [manualIncomes, setManualIncomes] = useState<EconomyIncomeRecord[]>([]);
  const [manualExpenses, setManualExpenses] = useState<EconomyExpenseRecord[]>([]);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [incomeForm, setIncomeForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "manual",
    student: "",
    amount: "",
    status: "paid",
  });
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "otros",
    description: "",
    amount: "",
  });

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "ingresos" || requestedTab === "gastos" || requestedTab === "resumen") {
      setTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ECONOMY_TAB_KEY, tab);
  }, [tab]);

  const loadEconomyData = async () => {
    setIsLoadingData(true);
    setLoadError(null);

    // Always restore manual rows first so reloads remain consistent even if API calls fail.
    setManualIncomes(getManualIncomes());
    setManualExpenses(getManualExpenses());

    const [paymentsResult, teachersResult] = await Promise.allSettled([getPayments(), getTeachers()]);

    if (paymentsResult.status === "fulfilled") {
      setPayments(paymentsResult.value || []);
      persistArray(ECONOMY_PAYMENTS_CACHE_KEY, paymentsResult.value || []);
    } else {
      setPayments((previous) => {
        if (previous.length > 0) return previous;
        return readStoredArray<Awaited<ReturnType<typeof getPayments>>[number]>(ECONOMY_PAYMENTS_CACHE_KEY);
      });
    }

    if (teachersResult.status === "fulfilled") {
      setTeachers(teachersResult.value || []);
      persistArray(ECONOMY_TEACHERS_CACHE_KEY, teachersResult.value || []);
    } else {
      setTeachers((previous) => {
        if (previous.length > 0) return previous;
        return readStoredArray<Awaited<ReturnType<typeof getTeachers>>[number]>(ECONOMY_TEACHERS_CACHE_KEY);
      });
    }

    if (paymentsResult.status === "rejected" && teachersResult.status === "rejected") {
      setLoadError("No se pudo cargar la información de economía.");
    }

    setIsLoadingData(false);
  };

  useEffect(() => {
    void loadEconomyData();
  }, []);

  const summary12 = useMemo(() => {
    return buildEconomySnapshot({
      payments,
      teachers,
      months: 12,
      manualIncomes,
      manualExpenses,
    });
  }, [payments, teachers, manualIncomes, manualExpenses]);

  const summary6 = useMemo(() => {
    return buildEconomySnapshot({
      payments,
      teachers,
      months: 6,
      manualIncomes,
      manualExpenses,
    });
  }, [payments, teachers, manualIncomes, manualExpenses]);

  const handleAddIncome = () => {
    const amount = Number(incomeForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Ingresa un importe válido");
      return;
    }

    addManualIncome({
      date: incomeForm.date,
      type: (incomeForm.type as EconomyIncomeRecord["type"]) || "manual",
      student: incomeForm.student || "-",
      amount,
      status: incomeForm.status as EconomyIncomeRecord["status"],
    });

    setManualIncomes(getManualIncomes());
    setIncomeDialogOpen(false);
    setIncomeForm({
      date: new Date().toISOString().slice(0, 10),
      type: "manual",
      student: "",
      amount: "",
      status: "paid",
    });
    toast.success("Ingreso guardado correctamente");
  };

  const handleAddExpense = () => {
    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Ingresa un importe válido");
      return;
    }

    addManualExpense({
      date: expenseForm.date,
      category: expenseForm.category as EconomyExpenseRecord["category"],
      description: expenseForm.description || "Gasto manual",
      amount,
    });

    setManualExpenses(getManualExpenses());
    setExpenseDialogOpen(false);
    setExpenseForm({
      date: new Date().toISOString().slice(0, 10),
      category: "otros",
      description: "",
      amount: "",
    });
    toast.success("Gasto guardado correctamente");
  };

  return (
    <PageContainer
      title="Economía"
      description="Visión financiera clara para decidir con rapidez"
      actions={
        <>
          <ModuleHelpShortcut module="economia" />
          <Button variant="outline" onClick={() => void loadEconomyData()} disabled={isLoadingData}>
            {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Recargar</span>
          </Button>
          <Button variant="outline" onClick={() => setIncomeDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar ingreso
          </Button>
          <Button onClick={() => setExpenseDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar gasto
          </Button>
        </>
      }
    >
      {loadError && payments.length === 0 && manualIncomes.length === 0 && manualExpenses.length === 0 ? (
        <EmptyState
          type="error"
          title="Economía no disponible"
          description={loadError}
          actionLabel="Reintentar"
          onAction={() => void loadEconomyData()}
        />
      ) : null}

      <section className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Todo conectado. Todo bajo control.</p>
        <p className="mt-1 text-xs text-muted-foreground">Supervisa ingresos, gastos y balance sin complejidad contable.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Ingresos del mes</p>
            <p className="text-lg font-semibold text-foreground">{euro(summary12.monthlyIncome)}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Gastos del mes</p>
            <p className="text-lg font-semibold text-foreground">{euro(summary12.monthlyExpenses)}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Balance</p>
            <p className={`text-lg font-semibold ${summary12.monthlyBalance >= 0 ? "text-success" : "text-destructive"}`}>
              {summary12.monthlyBalance >= 0 ? "+" : ""}{euro(summary12.monthlyBalance)}
            </p>
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ingresos mensuales</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{euro(summary12.monthlyIncome)}</p>
                <p className="text-xs text-muted-foreground">{pctDiff(summary12.monthlyIncome, summary12.previousMonthlyIncome)} vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gastos estimados</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{euro(summary12.monthlyExpenses)}</p>
                <p className="text-xs text-muted-foreground">Profesores + otros</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" /> Balance mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${summary12.monthlyBalance >= 0 ? "text-success" : "text-destructive"}`}>
                  {summary12.monthlyBalance >= 0 ? "+" : ""}{euro(summary12.monthlyBalance)}
                </p>
                <p className="text-xs text-muted-foreground">Comparativa: {pctDiff(summary12.monthlyExpenses, summary12.previousMonthlyExpenses)} gastos vs mes anterior</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tendencia 12 meses</CardTitle>
              <CardDescription>Ingresos vs gastos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={summary12.series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `${v}`} />
                  <Tooltip formatter={(v: number) => euro(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="ingresos" stroke="hsl(142, 72%, 35%)" fill="hsl(142, 72%, 35%)" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="gastos" stroke="hsl(0, 72%, 50%)" fill="hsl(0, 72%, 50%)" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Breakdown ingresos</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Cuotas alumnos</span><span className="font-semibold">{euro(summary12.breakdownIncome.cuotas)}</span></div>
                <div className="flex items-center justify-between"><span>Eventos</span><span className="font-semibold">{euro(summary12.breakdownIncome.eventos)}</span></div>
                <div className="flex items-center justify-between"><span>Otros</span><span className="font-semibold">{euro(summary12.breakdownIncome.otros)}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Breakdown gastos</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Profesores</span><span className="font-semibold">{euro(summary12.breakdownExpense.profesores)}</span></div>
                <div className="flex items-center justify-between"><span>Otros</span><span className="font-semibold">{euro(summary12.breakdownExpense.otros)}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Recomendaciones</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {summary12.recommendations.map((item, idx) => (
                <div key={idx} className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{item}</div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingresos">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
              <CardDescription>Cuotas, eventos y movimientos manuales</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary12.incomeRows.slice(0, 100).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date.slice(0, 10)}</TableCell>
                      <TableCell className="capitalize">{row.type}</TableCell>
                      <TableCell>{row.student || "-"}</TableCell>
                      <TableCell className="font-semibold">{euro(row.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={row.status === "paid" ? "text-success" : "text-warning"}>
                          {row.status === "paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {summary12.incomeRows.length === 0 ? (
                <EmptyState
                  type="payments"
                  title="Sin ingresos registrados"
                  description="Añade un ingreso manual para empezar a construir el histórico de economía."
                  actionLabel="Añadir ingreso"
                  onAction={() => setIncomeDialogOpen(true)}
                />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gastos">
          <Card>
            <CardHeader>
              <CardTitle>Gastos</CardTitle>
              <CardDescription>Profesores y gastos manuales</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary12.expenseRows.slice(0, 100).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date.slice(0, 10)}</TableCell>
                      <TableCell className="capitalize">{row.category}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="font-semibold text-destructive">{euro(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {summary12.expenseRows.length === 0 ? (
                <EmptyState
                  title="Sin gastos registrados"
                  description="Registra un gasto para tener una vista real de márgenes y balance mensual."
                  actionLabel="Añadir gasto"
                  onAction={() => setExpenseDialogOpen(true)}
                />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir ingreso</DialogTitle>
            <DialogDescription>Registra un ingreso manual en segundos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={incomeForm.date} onChange={(e) => setIncomeForm((prev) => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={incomeForm.type} onValueChange={(value) => setIncomeForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Alumno (si aplica)</Label>
              <Input
                value={incomeForm.student}
                onChange={(e) => setIncomeForm((prev) => ({ ...prev, student: e.target.value }))}
                placeholder="Nombre del alumno o referencia"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Importe</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={incomeForm.status} onValueChange={(value) => setIncomeForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncomeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddIncome}><ArrowUpRight className="h-4 w-4 mr-1" /> Guardar ingreso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir gasto</DialogTitle>
            <DialogDescription>Registra un gasto manual simple.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="herramientas">Herramientas</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: material de clase o herramienta"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Importe</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddExpense}><ArrowDownRight className="h-4 w-4 mr-1" /> Guardar gasto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground">
            Menos gestión, más enseñanza: este módulo ofrece una visión operativa simple sin contabilidad compleja.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Vista rápida (6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={summary6.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(v: number) => euro(v)} />
              <Area type="monotone" dataKey="ingresos" stroke="hsl(142, 72%, 35%)" fill="hsl(142, 72%, 35%)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="gastos" stroke="hsl(0, 72%, 50%)" fill="hsl(0, 72%, 50%)" fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
