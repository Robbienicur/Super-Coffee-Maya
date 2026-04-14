import SummaryCards from '@/components/SummaryCards'
import SalesChart from '@/components/SalesChart'
import LowStockAlerts from '@/components/LowStockAlerts'
import ActivityFeed from '@/components/ActivityFeed'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-coffee-900">Dashboard</h1>
      <SummaryCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div className="space-y-6">
          <LowStockAlerts />
        </div>
      </div>
      <ActivityFeed />
    </div>
  )
}
