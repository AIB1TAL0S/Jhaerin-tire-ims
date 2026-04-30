<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { LineChart } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import { browser } from '$app/environment';
	import type { TrendDataPoint } from '$lib/server/models/sales';

	interface Props {
		data: TrendDataPoint[];
	}

	let { data }: Props = $props();

	// LineChart needs a single y key — create two separate series datasets
	const revenueData = $derived(data.map((d) => ({ label: d.label, revenue: d.revenue, grossProfit: d.grossProfit })));

	const chartConfig = {
		revenue: {
			label: 'Revenue',
			color: 'var(--chart-1)'
		},
		grossProfit: {
			label: 'Gross Profit',
			color: 'var(--chart-2)'
		}
	} satisfies Chart.ChartConfig;
</script>

<div class="space-y-3">
	<h3 class="text-foreground text-sm font-semibold">Revenue & Gross Profit</h3>

	{#if data.length === 0}
		<div class="text-muted-foreground flex h-48 items-center justify-center text-sm">
			No trend data for this period.
		</div>
	{:else}
		{#if browser}
			<Chart.Container config={chartConfig} class="h-48 w-full">
				<LineChart
					data={revenueData}
					x="label"
					axis="x"
					series={[
						{ key: 'revenue', label: 'Revenue', color: chartConfig.revenue.color },
						{ key: 'grossProfit', label: 'Gross Profit', color: chartConfig.grossProfit.color }
					]}
					props={{
						spline: { curve: curveNatural, strokeWidth: 2 },
						xAxis: { format: (d: string) => d.length > 8 ? d.slice(0, 8) : d }
					}}
				>
					{#snippet tooltip()}
						<Chart.Tooltip />
					{/snippet}
				</LineChart>
			</Chart.Container>
		{:else}
			<div class="bg-muted h-48 w-full animate-pulse rounded-lg"></div>
		{/if}
	{/if}
</div>
