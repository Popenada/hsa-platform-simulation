import { Card, CardContent } from "@/components/ui/card";

export default function RecentTransactions() {
  return (
    <Card>
      <CardContent>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No recent transactions.
        </p>
      </CardContent>
    </Card>
  );
}
