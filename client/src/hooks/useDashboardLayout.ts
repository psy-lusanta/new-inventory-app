import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

export type WidgetId =
  | 'asset_tags'
  | 'cost_growth'
  | 'monthly_chart_and_pie_chart'
  | 'recent_activity'
  | 'records_chart'
  | 'top_tables'
  | 'overall_records'
  | 'dropdown_stats'

export const WIDGET_LABELS: Record<WidgetId, string> = {
  asset_tags: 'Total Assets',
  cost_growth: 'Cost Growth',
  monthly_chart_and_pie_chart: 'Monthly Records & Table Distribution',
  recent_activity: 'Recent Activity',
  records_chart: 'Overall Records',
  top_tables: 'Top Tables by Volume',
  overall_records: 'Records by Table (Stacked)',
  dropdown_stats: 'Dropdown Distribution',
}

export const DEFAULT_ORDER: WidgetId[] = [
  'asset_tags',
  'cost_growth',
  'monthly_chart_and_pie_chart',
  'recent_activity',
  'records_chart',
  'top_tables',
  'overall_records',
  'dropdown_stats',
]

export const useDashboardLayout = () => {
  const { user } = useAuth()

  const getStorageKey = useCallback(
    () => `dashboard-layout-${user?.id}`,
    [user?.id]
  )
  const getHiddenKey = useCallback(
    () => `dashboard-hidden-${user?.id}`,
    [user?.id]
  )

  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER)
  const [hidden, setHidden] = useState<WidgetId[]>([])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Wait until user is fully loaded
    if (!user?.id) return

    let loadedOrder = DEFAULT_ORDER
    let loadedHidden: WidgetId[] = []

    try {
      const savedOrder = localStorage.getItem(getStorageKey())
      if (savedOrder) {
        const parsed: WidgetId[] = JSON.parse(savedOrder)
        // Keep saved order but add any new widgets not yet saved
        const validSaved = parsed.filter((id) =>
          (DEFAULT_ORDER as string[]).includes(id)
        )
        const newWidgets = DEFAULT_ORDER.filter(
          (id) => !parsed.includes(id)
        )
        loadedOrder = [...validSaved, ...newWidgets]
      }
    } catch { }

    try {
      const savedHidden = localStorage.getItem(getHiddenKey())
      if (savedHidden) {
        const parsed: WidgetId[] = JSON.parse(savedHidden)
        // Only keep hidden IDs that are valid widget IDs
        loadedHidden = parsed.filter((id) =>
          (DEFAULT_ORDER as string[]).includes(id)
        )
      }
    } catch { }

    setOrder(loadedOrder)
    setHidden(loadedHidden)
    setInitialized(true)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveOrder = useCallback((newOrder: WidgetId[]) => {
    setOrder(newOrder)
    if (user?.id) {
      localStorage.setItem(getStorageKey(), JSON.stringify(newOrder))
    }
  }, [user?.id, getStorageKey])

  const toggleHidden = useCallback((id: WidgetId) => {
    setHidden((prev) => {
      const newHidden = prev.includes(id)
        ? prev.filter((h) => h !== id)
        : [...prev, id]
      if (user?.id) {
        localStorage.setItem(getHiddenKey(), JSON.stringify(newHidden))
      }
      return newHidden
    })
  }, [user?.id, getHiddenKey])

  const resetLayout = useCallback(() => {
    setOrder(DEFAULT_ORDER)
    setHidden([])
    if (user?.id) {
      localStorage.removeItem(getStorageKey())
      localStorage.removeItem(getHiddenKey())
    }
  }, [user?.id, getStorageKey, getHiddenKey])

  return {
    order,
    hidden,
    visibleWidgets: order.filter((id) => !hidden.includes(id)),
    saveOrder,
    toggleHidden,
    resetLayout,
    initialized,
  }
}