import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/cards/StatCard";
import { Users, GraduationCap, CreditCard, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  return (
    <PageContainer
      title="Dashboard"
      description="Overview of your dance school"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={248}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Active Classes"
          value={18}
          change="2 new this week"
          changeType="positive"
          icon={GraduationCap}
        />
        <StatCard
          title="Revenue"
          value="$12,450"
          change="+8% from last month"
          changeType="positive"
          icon={CreditCard}
        />
        <StatCard
          title="Enrollment Rate"
          value="92%"
          change="+3% from last month"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Enrollments</h3>
          <div className="space-y-3">
            {[
              { name: "Maria Santos", class: "Contemporary Dance", time: "2 hours ago" },
              { name: "João Silva", class: "Ballet Beginners", time: "5 hours ago" },
              { name: "Ana Oliveira", class: "Hip Hop Kids", time: "1 day ago" },
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
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Upcoming Classes</h3>
          <div className="space-y-3">
            {[
              { name: "Ballet Advanced", teacher: "Ms. Rivera", time: "Today, 3:00 PM", spots: "4/15" },
              { name: "Jazz Fusion", teacher: "Mr. Costa", time: "Today, 5:00 PM", spots: "8/12" },
              { name: "Contemporary", teacher: "Ms. Lima", time: "Tomorrow, 10:00 AM", spots: "6/15" },
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
