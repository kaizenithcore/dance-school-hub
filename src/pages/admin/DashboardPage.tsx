import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/cards/StatCard";
import { Users, GraduationCap, CreditCard, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  return (
    <PageContainer
      title="Panel"
      description="Resumen general de tu escuela de danza"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Alumnos"
          value={248}
          change="+12% respecto al mes pasado"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Clases Activas"
          value={18}
          change="2 nuevas esta semana"
          changeType="positive"
          icon={GraduationCap}
        />
        <StatCard
          title="Ingresos"
          value="$12.450"
          change="+8% respecto al mes pasado"
          changeType="positive"
          icon={CreditCard}
        />
        <StatCard
          title="Tasa de Inscripción"
          value="92%"
          change="+3% respecto al mes pasado"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Inscripciones Recientes</h3>
          <div className="space-y-3">
            {[
              { name: "María Santos", class: "Danza Contemporánea", time: "Hace 2 horas" },
              { name: "João Silva", class: "Ballet Principiantes", time: "Hace 5 horas" },
              { name: "Ana Oliveira", class: "Hip Hop Niños", time: "Hace 1 día" },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.class}</p>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Próximas Clases</h3>
          <div className="space-y-3">
            {[
              { name: "Ballet Avanzado", teacher: "Prof. Rivera", time: "Hoy, 15:00", spots: "4/15" },
              { name: "Jazz Fusión", teacher: "Prof. Costa", time: "Hoy, 17:00", spots: "8/12" },
              { name: "Contemporáneo", teacher: "Prof. Lima", time: "Mañana, 10:00", spots: "6/15" },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.teacher} · {item.time}</p>
                </div>
                <span className="text-xs font-medium text-accent-foreground bg-accent rounded-full px-2.5 py-0.5">
                  {item.spots}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
