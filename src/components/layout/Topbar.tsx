import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCheck, Clock3, CreditCard, KeyRound, LogOut, Search, Settings2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudents } from "@/lib/api/students";
import { getClasses } from "@/lib/api/classes";
import { getEnrollments } from "@/lib/api/enrollments";
import { getPayments } from "@/lib/api/payments";
import { getTeachers } from "@/lib/api/teachers";
import { getRooms } from "@/lib/api/rooms";
import { getSchoolSettings } from "@/lib/api/settings";
import { getCurrentAuthContext, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { AuthContextResponse } from "@/lib/api/auth";
import { validateStrongPassword } from "@/lib/security";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TopbarProps {
  title?: string;
}

type SearchGroup = "Navegación" | "Alumnos" | "Clases" | "Inscripciones" | "Pagos" | "Profesores" | "Aulas";
type SearchAction = "preview" | "edit" | "delete";

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  target: string;
  group: SearchGroup;
  action?: SearchAction;
  keywords?: string[];
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  kind: "enrollment" | "payment";
  date: string;
  target: string;
  read: boolean;
}

interface SecurityRuntimeSettings {
  requireStrongPassword: boolean;
  allowTwoFactor: boolean;
  sessionTimeoutMinutes: string;
  loginAlerts: boolean;
}

interface BillingRuntimeSettings {
  planType: string;
}

interface NotificationsRuntimeSettings {
  emailNewEnrollment: boolean;
  emailPaymentOverdue: boolean;
}

const NOTIFICATION_READ_STORAGE_KEY = "dance-school-hub.notifications.read";

const NAV_ITEMS: SearchItem[] = [
  { id: "nav-panel", label: "Panel", target: "/admin", group: "Navegación" },
  { id: "nav-horarios", label: "Horarios", target: "/admin/schedule", group: "Navegación" },
  { id: "nav-clases", label: "Clases", target: "/admin/classes", group: "Navegación" },
  { id: "nav-aulas", label: "Aulas", target: "/admin/rooms", group: "Navegación" },
  { id: "nav-profesores", label: "Profesores", target: "/admin/teachers", group: "Navegación" },
  { id: "nav-alumnos", label: "Alumnos", target: "/admin/students", group: "Navegación" },
  { id: "nav-inscripciones", label: "Inscripciones", target: "/admin/enrollments", group: "Navegación" },
  { id: "nav-form-builder", label: "Formulario de inscripción", target: "/admin/form-builder", group: "Navegación" },
  { id: "nav-pricing", label: "Tarifas y Bonos", target: "/admin/pricing", group: "Navegación" },
  { id: "nav-pagos", label: "Pagos", target: "/admin/payments", group: "Navegación" },
  { id: "nav-comunicacion", label: "Comunicación", target: "/admin/communications", group: "Navegación" },
  { id: "nav-waitlist", label: "Lista de Espera", target: "/admin/waitlist", group: "Navegación" },
  { id: "nav-renewals", label: "Renovaciones", target: "/admin/renewals", group: "Navegación" },
  { id: "nav-course-clone", label: "Duplicar cursos", target: "/admin/course-clone", group: "Navegación" },
  { id: "nav-reception", label: "Recepción", target: "/admin/reception", group: "Navegación" },
  { id: "nav-analytics", label: "Analíticas", target: "/admin/analytics", group: "Navegación" },
  { id: "nav-settings", label: "Configuración", target: "/admin/settings", group: "Navegación" },
];

export function Topbar({ title }: TopbarProps) {
  const navigate = useNavigate();
  const [openSearch, setOpenSearch] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dynamicItems, setDynamicItems] = useState<SearchItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [authContext, setAuthContext] = useState<AuthContextResponse | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySettings, setSecuritySettings] = useState<SecurityRuntimeSettings>({
    requireStrongPassword: true,
    allowTwoFactor: false,
    sessionTimeoutMinutes: "120",
    loginAlerts: true,
  });
  const [billingSettings, setBillingSettings] = useState<BillingRuntimeSettings>({
    planType: "starter",
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationsRuntimeSettings>({
    emailNewEnrollment: true,
    emailPaymentOverdue: true,
  });

  const loadAuthContext = useCallback(async () => {
    try {
      const context = await getCurrentAuthContext();
      setAuthContext(context);
    } catch {
      setAuthContext(null);
    }
  }, []);

  const loadRuntimeSettings = useCallback(async () => {
    try {
      const settings = await getSchoolSettings();
      const security = (settings?.security || {}) as Partial<SecurityRuntimeSettings>;
      const billing = (settings?.billing || {}) as Partial<BillingRuntimeSettings>;
      const notifications = (settings?.notifications || {}) as Partial<NotificationsRuntimeSettings>;

      setSecuritySettings((prev) => ({ ...prev, ...security }));
      setBillingSettings((prev) => ({ ...prev, ...billing }));
      setNotificationSettings((prev) => ({ ...prev, ...notifications }));
    } catch {
      // Keep defaults on runtime settings if settings fetch fails
    }
  }, []);

  useEffect(() => {
    void loadAuthContext();
  }, [loadAuthContext]);

  useEffect(() => {
    void loadRuntimeSettings();
  }, [loadRuntimeSettings]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      setReadNotificationIds(new Set(parsed));
    } catch {
      setReadNotificationIds(new Set());
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(Array.from(readNotificationIds)));
  }, [readNotificationIds]);

  const loadDynamicItems = useCallback(async () => {
    setLoading(true);
    const [studentsResult, classesResult, enrollmentsResult, paymentsResult, teachersResult, roomsResult] = await Promise.allSettled([
      getStudents(),
      getClasses(),
      getEnrollments(),
      getPayments(),
      getTeachers(),
      getRooms(),
    ]);

    const students = studentsResult.status === "fulfilled" ? studentsResult.value : [];
    const classes = classesResult.status === "fulfilled" ? classesResult.value : [];
    const enrollments = enrollmentsResult.status === "fulfilled" ? enrollmentsResult.value : [];
    const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : [];
    const teachers = teachersResult.status === "fulfilled" ? teachersResult.value : [];
    const rooms = roomsResult.status === "fulfilled" ? roomsResult.value : [];

    const buildActionTarget = (base: string, id: string, action: SearchAction) => `${base}?id=${encodeURIComponent(id)}&action=${action}`;

    const nextItems: SearchItem[] = [
      ...students.flatMap((student) => ([
        {
        id: `student-preview-${student.id}`,
        label: student.name,
        description: `Vista previa · ${student.email || student.phone || "Alumno"}`,
        target: buildActionTarget("/admin/students", student.id, "preview"),
        group: "Alumnos" as const,
        action: "preview" as const,
        keywords: [student.status, "alumno", "vista previa"],
      },
      {
        id: `student-edit-${student.id}`,
        label: `Editar · ${student.name}`,
        description: student.email || student.phone || "Alumno",
        target: buildActionTarget("/admin/students", student.id, "edit"),
        group: "Alumnos" as const,
        action: "edit" as const,
        keywords: [student.status, "alumno", "editar"],
      },
      {
        id: `student-delete-${student.id}`,
        label: `Eliminar · ${student.name}`,
        description: student.email || student.phone || "Alumno",
        target: buildActionTarget("/admin/students", student.id, "delete"),
        group: "Alumnos" as const,
        action: "delete" as const,
        keywords: [student.status, "alumno", "eliminar"],
      },
      ])),
      ...classes.flatMap((cls) => ([
        {
        id: `class-preview-${cls.id}`,
        label: cls.name,
        description: `Vista previa · ${cls.discipline || "Clase"}`,
        target: buildActionTarget("/admin/classes", cls.id, "preview"),
        group: "Clases" as const,
        action: "preview" as const,
        keywords: [cls.status, "clase", "vista previa"],
      },
      {
        id: `class-edit-${cls.id}`,
        label: `Editar · ${cls.name}`,
        description: cls.discipline || "Clase",
        target: buildActionTarget("/admin/classes", cls.id, "edit"),
        group: "Clases" as const,
        action: "edit" as const,
        keywords: [cls.status, "clase", "editar"],
      },
      {
        id: `class-delete-${cls.id}`,
        label: `Eliminar · ${cls.name}`,
        description: cls.discipline || "Clase",
        target: buildActionTarget("/admin/classes", cls.id, "delete"),
        group: "Clases" as const,
        action: "delete" as const,
        keywords: [cls.status, "clase", "eliminar"],
      },
      ])),
      ...enrollments.map((enrollment) => ({
        id: `enrollment-${enrollment.id}`,
        label: enrollment.studentName,
        description: `Vista previa · ${enrollment.status} · ${enrollment.studentEmail}`,
        target: buildActionTarget("/admin/enrollments", enrollment.id, "preview"),
        group: "Inscripciones" as const,
        action: "preview" as const,
        keywords: [enrollment.status, "inscripción", "vista previa"],
      })),
      ...payments.map((payment) => ({
        id: `payment-${payment.id}`,
        label: payment.studentName,
        description: `Vista previa · ${payment.concept} · ${payment.month} · ${payment.status}`,
        target: buildActionTarget("/admin/payments", payment.id, "preview"),
        group: "Pagos" as const,
        action: "preview" as const,
        keywords: [payment.status, payment.method, "pago", "vista previa"],
      })),
      ...teachers.flatMap((teacher) => ([
        {
        id: `teacher-preview-${teacher.id}`,
        label: teacher.name,
        description: `Vista previa · ${teacher.email || teacher.phone || "Profesor"}`,
        target: buildActionTarget("/admin/teachers", teacher.id, "preview"),
        group: "Profesores" as const,
        action: "preview" as const,
        keywords: [teacher.status, "profesor", "vista previa"],
      },
      {
        id: `teacher-edit-${teacher.id}`,
        label: `Editar · ${teacher.name}`,
        description: teacher.email || teacher.phone || "Profesor",
        target: buildActionTarget("/admin/teachers", teacher.id, "edit"),
        group: "Profesores" as const,
        action: "edit" as const,
        keywords: [teacher.status, "profesor", "editar"],
      },
      {
        id: `teacher-delete-${teacher.id}`,
        label: `Eliminar · ${teacher.name}`,
        description: teacher.email || teacher.phone || "Profesor",
        target: buildActionTarget("/admin/teachers", teacher.id, "delete"),
        group: "Profesores" as const,
        action: "delete" as const,
        keywords: [teacher.status, "profesor", "eliminar"],
      },
      ])),
      ...rooms.map((room) => ({
        id: `room-${room.id}`,
        label: room.name,
        description: `Capacidad ${room.capacity}`,
        target: "/admin/rooms",
        group: "Aulas" as const,
        keywords: ["aula", room.isActive ? "activa" : "inactiva"],
      })),
    ];

    const enrollmentNotifications = notificationSettings.emailNewEnrollment
      ? enrollments
        .filter((enrollment) => enrollment.status === "pending")
        .slice(0, 6)
        .map((enrollment) => {
          const notificationId = `enrollment-pending-${enrollment.id}`;
          return {
            id: notificationId,
            title: "Inscripción pendiente",
            description: `${enrollment.studentName} espera revisión`,
            kind: "enrollment" as const,
            date: enrollment.date,
            target: buildActionTarget("/admin/enrollments", enrollment.id, "preview"),
            read: readNotificationIds.has(notificationId),
          };
        })
      : [];

    const paymentNotifications = notificationSettings.emailPaymentOverdue
      ? payments
        .filter((payment) => payment.status === "overdue")
        .slice(0, 6)
        .map((payment) => {
          const notificationId = `payment-overdue-${payment.id}`;
          return {
            id: notificationId,
            title: "Pago vencido",
            description: `${payment.studentName} · ${payment.concept}`,
            kind: "payment" as const,
            date: payment.dueAt || payment.date,
            target: buildActionTarget("/admin/payments", payment.id, "preview"),
            read: readNotificationIds.has(notificationId),
          };
        })
      : [];

    const nextNotifications: NotificationItem[] = [
      ...enrollmentNotifications,
      ...paymentNotifications,
    ]
      .sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0))
      .slice(0, 10);

    setDynamicItems(nextItems);
    setNotifications(nextNotifications);
    setLoadedOnce(true);
    setLoading(false);
  }, [notificationSettings.emailNewEnrollment, notificationSettings.emailPaymentOverdue, readNotificationIds]);

  useEffect(() => {
    if (!openSearch || loadedOnce) {
      return;
    }

    void loadDynamicItems();
  }, [openSearch, loadedOnce, loadDynamicItems]);

  useEffect(() => {
    if (!openNotifications) {
      return;
    }

    void loadDynamicItems();
  }, [openNotifications, loadDynamicItems]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpenSearch((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groupedItems = useMemo(() => {
    const grouped: Record<SearchGroup, SearchItem[]> = {
      Navegación: NAV_ITEMS,
      Alumnos: [],
      Clases: [],
      Inscripciones: [],
      Pagos: [],
      Profesores: [],
      Aulas: [],
    };

    for (const item of dynamicItems) {
      grouped[item.group].push(item);
    }

    return grouped;
  }, [dynamicItems]);

  const handleSelect = (target: string) => {
    setOpenSearch(false);
    navigate(target);
  };

  const getActionLabel = (action?: SearchAction) => {
    if (action === "preview") return "VER";
    if (action === "edit") return "EDITAR";
    if (action === "delete") return "ELIMINAR";
    return null;
  };

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const formatNotificationDate = (dateValue: string) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "Reciente";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Hace menos de 1 h";
    if (diffHours < 24) return `Hace ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays} d`;

    return date.toLocaleDateString("es-ES");
  };

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(notificationId);
      return next;
    });

    setNotifications((prev) => prev.map((item) => (
      item.id === notificationId ? { ...item, read: true } : item
    )));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      for (const notification of notifications) {
        next.add(notification.id);
      }
      return next;
    });

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, [notifications]);

  const handleNotificationSelect = (notification: NotificationItem) => {
    markNotificationAsRead(notification.id);
    setOpenNotifications(false);
    navigate(notification.target);
  };

  const activeMembership = useMemo(() => {
    if (!authContext) {
      return null;
    }

    return authContext.memberships.find((membership) => membership.tenantId === authContext.tenant.id)
      ?? authContext.memberships[0]
      ?? null;
  }, [authContext]);

  const roleLabel = useMemo(() => {
    const role = authContext?.tenant.role;
    if (role === "owner") return "Propietario";
    if (role === "admin") return "Administrador";
    if (role === "staff") return "Staff";
    return "Sin rol";
  }, [authContext]);

  const handleOpenSettings = useCallback(() => {
    setOpenProfile(false);
    navigate("/admin/settings");
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      await logout();
      toast.success("Sesión cerrada correctamente");
      navigate("/auth/login", { replace: true });
    } catch {
      toast.error("No se pudo cerrar la sesión");
    } finally {
      setSigningOut(false);
      setOpenProfile(false);
    }
  }, [navigate, signingOut]);

  const handleUpdatePassword = useCallback(async () => {
    if (updatingPassword) {
      return;
    }

    if (!currentPassword.trim()) {
      toast.error("Introduce tu contraseña actual");
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error("Completa los campos de nueva contraseña");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("La confirmación no coincide");
      return;
    }

    if (securitySettings.requireStrongPassword) {
      const policy = validateStrongPassword(newPassword);
      if (!policy.valid) {
        toast.error(`Contraseña insegura: ${policy.errors[0]}`);
        return;
      }
    } else if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setUpdatingPassword(true);
    try {
      const signInResult = await supabase.auth.signInWithPassword({
        email: authContext?.user.email || "",
        password: currentPassword,
      });

      if (signInResult.error) {
        toast.error("La contraseña actual es incorrecta");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast.error(updateError.message || "No se pudo actualizar la contraseña");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña actualizada correctamente");
    } catch {
      toast.error("No se pudo actualizar la contraseña");
    } finally {
      setUpdatingPassword(false);
    }
  }, [authContext?.user.email, confirmPassword, currentPassword, newPassword, securitySettings.requireStrongPassword, updatingPassword]);

  const planLabel = useMemo(() => {
    if (billingSettings.planType === "enterprise") return "Enterprise";
    if (billingSettings.planType === "pro") return "Pro";
    return "Starter";
  }, [billingSettings.planType]);

  return (
    <>
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {title && (
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Búsqueda rápida"
            onClick={() => setOpenSearch(true)}
          >
            <Search className="h-[18px] w-[18px]" />
          </Button>
          <Popover open={openNotifications} onOpenChange={setOpenNotifications}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative" aria-label="Notificaciones">
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] p-0">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Notificaciones</p>
                  <p className="text-xs text-muted-foreground">{unreadCount} sin leer</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead} disabled={notifications.length === 0 || unreadCount === 0}>
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar todo
                </Button>
              </div>
              <Separator />
              <ScrollArea className="max-h-80">
                <div className="p-2">
                  {loading ? (
                    <div className="px-3 py-8 text-center text-xs text-muted-foreground">Cargando notificaciones...</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-xs text-muted-foreground">No hay notificaciones nuevas.</div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={cn(
                          "w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/70",
                          !notification.read && "bg-primary/5"
                        )}
                        onClick={() => handleNotificationSelect(notification)}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "mt-0.5 rounded-full p-1",
                            notification.kind === "payment" ? "bg-warning/20 text-warning" : "bg-primary/15 text-primary"
                          )}>
                            {notification.kind === "payment" ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <Clock3 className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
                              {!notification.read ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{notification.description}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{formatNotificationDate(notification.date)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Dialog open={openProfile} onOpenChange={setOpenProfile}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/80"
                aria-label="Perfil y cuenta"
              >
                <User className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px]">
              <DialogHeader>
                <DialogTitle>Perfil y cuenta</DialogTitle>
                <DialogDescription>
                  Gestiona tu cuenta, seguridad y plan de forma sencilla.
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="account" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="account">Cuenta</TabsTrigger>
                  <TabsTrigger value="security">Seguridad</TabsTrigger>
                  <TabsTrigger value="billing">Plan</TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-4 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        value={authContext?.user.email || "Sin correo"}
                        readOnly
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-role">Rol</Label>
                      <Input id="profile-role" value={roleLabel} readOnly />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="profile-tenant">Escuela</Label>
                      <Input
                        id="profile-tenant"
                        value={activeMembership?.tenantName || "Sin escuela"}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                    Próximamente podrás gestionar nombre visible, foto y preferencias desde esta sección.
                  </div>
                  <Button type="button" variant="outline" onClick={handleOpenSettings}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Abrir ajustes de cuenta
                  </Button>
                </TabsContent>

                <TabsContent value="security" className="space-y-4 pt-4">
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="current-password">Contraseña actual</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password">Nueva contraseña</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder={securitySettings.requireStrongPassword ? "8+ caracteres, mayúscula, número y símbolo" : "Mínimo 8 caracteres"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Política activa: {securitySettings.requireStrongPassword ? "contraseña fuerte requerida" : "mínimo 8 caracteres"}. Timeout de sesión: {securitySettings.sessionTimeoutMinutes} min.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void handleUpdatePassword()} disabled={updatingPassword}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      {updatingPassword ? "Actualizando..." : "Actualizar contraseña"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!securitySettings.allowTwoFactor}
                      onClick={() => toast.info("2FA habilitado. Configúralo desde el proveedor de autenticación (Supabase MFA)")}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {securitySettings.allowTwoFactor ? "Configurar doble factor" : "2FA deshabilitado por política"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="billing" className="space-y-4 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan actual</p>
                      <p className="mt-1 text-base font-semibold text-foreground">{planLabel}</p>
                      <p className="text-xs text-muted-foreground">Sin límites definidos todavía. Valor usado para reglas futuras.</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Fuente</p>
                      <p className="mt-1 text-base font-semibold text-foreground">Configuración de escuela</p>
                      <p className="text-xs text-muted-foreground">Puedes cambiarlo en la pestaña Billing de Configuración.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={handleOpenSettings}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Gestionar plan
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => navigate("/admin/payments") }>
                      Ver pagos
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpenProfile(false)}>
                  Cerrar
                </Button>
                <Button type="button" variant="destructive" onClick={handleSignOut} disabled={signingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <CommandDialog open={openSearch} onOpenChange={setOpenSearch}>
        <CommandInput placeholder="Buscar secciones, alumnos, clases, pagos, inscripciones, profesores o aulas..." />
        <CommandList>
          <CommandEmpty>{loading ? "Cargando elementos..." : "No se encontraron resultados."}</CommandEmpty>

          <CommandGroup heading="Navegación">
            {groupedItems.Navegación.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.target} ${(item.keywords || []).join(" ")}`}
                onSelect={() => handleSelect(item.target)}
              >
                <span>{item.label}</span>
                <CommandShortcut>{item.target.replace("/admin/", "") || "admin"}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {(Object.keys(groupedItems) as SearchGroup[])
            .filter((group) => group !== "Navegación" && groupedItems[group].length > 0)
            .map((group) => (
              <CommandGroup key={group} heading={group}>
                {groupedItems[group].slice(0, 20).map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.description || ""} ${(item.keywords || []).join(" ")}`}
                    onSelect={() => handleSelect(item.target)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>{item.label}</span>
                      {item.description ? <span className="text-xs text-muted-foreground">{item.description}</span> : null}
                    </div>
                    <CommandShortcut>{getActionLabel(item.action) || group}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
