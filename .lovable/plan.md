

## Plan: Dual Y-Axis for Temporal Charts + Funnel Conversion Rates

### Problem 1: Temporal Chart Scale
The impressions line (e.g. 14,000+) dwarfs the metric line (e.g. 1-31), making the metric line flat near zero. The fix is to use **dual Y-axes** (left for impressions/cost, right for metric/conversions) so both lines are readable at their own scale.

### Problem 2: Funnel Conversion Rates
The funnel shows absolute numbers but no conversion rates between steps. We'll add percentage labels between each funnel layer (e.g., Impressions -> Clicks = 2.8%).

---

### Changes

**1. Temporal Charts - Dual Y-Axis (`MetaAds.tsx`)**
- Add a second `<YAxis>` with `yAxisId="right"` and `orientation="right"` for the metric line
- Assign `yAxisId="left"` to impressions, `yAxisId="right"` to the primary metric
- This gives each line its own scale

**2. Temporal Charts - Dual Y-Axis (`GoogleAds.tsx`)**
- Same dual-axis approach for the daily chart (cost on left, conversions on right)
- Same for the monthly BarChart if applicable

**3. Funnel Conversion Rates (`FunnelChart.tsx`)**
- Between each funnel layer, render a small label showing the conversion rate: `(previous.value → current.value) / previous.value * 100`
- Display as a small badge/pill between layers, e.g. "2.84%"
- Apply to both Meta and Google funnels (same component)

