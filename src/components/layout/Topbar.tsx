import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCheck, Clock3, ExternalLink, LogOut, Search, User } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getStudents } from "@/lib/api/students";
import { getClasses } from "@/lib/api/classes";
import { getEnrollments } from "@/lib/api/enrollments";
import { getPayments } from "@/lib/api/payments";
import { getTeachers } from "@/lib/api/teachers";
import { getRooms } from "@/lib/api/rooms";
import { getSchoolSettings } from "@/lib/api/settings";
import { logout } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
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

interface NotificationsRuntimeSettings {
  emailNewEnrollment: boolean;
  emailPaymentOverdue: boolean;
}

interface SchoolIdentity {
  name: string;
  slug: string;
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
  const [signingOut, setSigningOut] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationsRuntimeSettings>({
    emailNewEnrollment: true,
    emailPaymentOverdue: true,
  });
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity | null>(null);
  const { authContext } = useAuth();

  const loadRuntimeSettings = useCallback(async () => {
    try {
      const settings = await getSchoolSettings();
      if (settings?.school?.slug) {
        setSchoolIdentity({
          name: settings.school.name,
          slug: settings.school.slug,
        });
      }
      const notifications = (settings?.notifications || {}) as Partial<NotificationsRuntimeSettings>;

      setNotificationSettings((prev) => ({ ...prev, ...notifications }));
    } catch {
      setSchoolIdentity(null);
      // Keep defaults on runtime settings if settings fetch fails
    }
  }, []);

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

  const schoolName = useMemo(
    () => activeMembership?.tenantName || schoolIdentity?.name || title || "Escuela",
    [activeMembership?.tenantName, schoolIdentity?.name, title]
  );

  const schoolSlug = useMemo(
    () => activeMembership?.tenantSlug || schoolIdentity?.slug || null,
    [activeMembership?.tenantSlug, schoolIdentity?.slug]
  );

  const publicSchoolUrl = useMemo(() => {
    if (!schoolSlug) {
      return null;
    }

    return `${window.location.origin}/s/${schoolSlug}`;
  }, [schoolSlug]);

  const handleOpenPublicSchool = useCallback(() => {
    if (!publicSchoolUrl) {
      toast.error("No se encontró un slug público para esta escuela");
      return;
    }

    window.location.assign(publicSchoolUrl);
  }, [publicSchoolUrl]);

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

  return (
    <>
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0 rounded-md px-2 py-1 text-left">
            <p className="truncate text-sm font-semibold text-foreground">{schoolName}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {schoolSlug ? `/s/${schoolSlug}` : "Slug público no disponible"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleOpenPublicSchool}
            disabled={!publicSchoolUrl}
            title={publicSchoolUrl ? "Abrir página pública" : "Slug público no disponible"}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver página pública
          </Button>
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
          <Popover open={openProfile} onOpenChange={setOpenProfile}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/80"
                aria-label="Perfil y cuenta"
              >
                <User className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-72 p-3">
              <p className="text-sm font-semibold text-foreground">Sesión</p>
              <p className="mt-1 text-xs text-muted-foreground">{authContext?.user.email || "Sin correo"}</p>
              <p className="text-xs text-muted-foreground">{activeMembership?.tenantName || "Sin escuela"} · {roleLabel}</p>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpenProfile(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" onClick={handleSignOut} disabled={signingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
