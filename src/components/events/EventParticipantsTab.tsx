import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EventParticipantsTab() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Gestión de participantes</p>
        <p className="text-xs mt-1">Próximamente podrás gestionar inscripciones y participantes del evento.</p>
      </CardContent>
    </Card>
  );
}
