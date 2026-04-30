<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { BarChart } from 'layerchart';
	import { scaleBand } from 'd3-scale';
	import { browser } from '$app/environment';
	import type { MonthlyFinancialSummary } from '$lib/server/models/sales';

	interface Props {
		data: MonthlyFinancialSummary[];
	}

	let { data }: Props = $props();

	const chartConfig = {
		totalRevenue: {
			label: 'Revenue',
			color: 'var(--chart-1)'
		},
		totalGrossProfit: {
			label: 'Gross Profit',
			color: 'var(--chart-2)'
		}
	} satisfies Chart.ChartConfig;

	function formatCurrency(v: number) {
		return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact' }).format(v);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-foreground text-sm font-semibold">Revenue vs Gross Profit</h3>
		<div class="flex items-center gap-4 text-xs">
			<span class="flex items-center gap-1.5">
				<span class="h-2 w-4 rounded-full" style="background: var(--chart-1)"></span>
				<span class="text-muted-foreground">Revenue</span>
			</span>
			<span class="flex items-center gap-1.5">
				<span class="h-2 w-4 rounded-full" style="background: var(--chart-2)"></span>
				<span class="text-muted-foreground">Gross Profit</span>
			</span>
		</div>
	</div>

	{#if data.length === 0}
		<div class="text-muted-foreground flex h-48 items-center justify-center text-sm">
			No financial data for this period.
		</div>
	{:else}
		{#if browser}
			<Chart.Container config={chartConfig} class="h-48 w-full">
				<BarChart
					{data}
					x="month"
					xScale={scaleBand().padding(0.2)}
					axis="x"
					seriesLayout="group"
					series={[
						{ key: 'totalRevenue', label: 'Revenue', color: chartConfig.totalRevenue.color },
						{ key: 'totalGrossProfit', label: 'Gross Profit', color: chartConfig.totalGrossProfit.color }
					]}
					props={{
						bars: { stroke: 'none', rounded: 'all', radius: 3 },
						xAxis: { format: (d: string) => d.slice(0, 3) }
					}}
				>
					{#snippet tooltip()}
						<Chart.Tooltip indicator="dashed" />
					{/snippet}
				</BarChart>
			</Chart.Container>
		{:else}
			<div class="bg-muted h-48 w-full animate-pulse rounded-lg"></div>
		{/if}

		<!-- Monthly table -->
		<div class="mt-4 overflow-x-auto">
			<table class="w-full text-xs">
				<thead>
					<tr class="border-border border-b">
						<th class="text-muted-foreground py-2 text-left font-medium">Month</th>
						<th class="text-muted-foreground py-2 text-right font-medium">Revenue</th>
						<th class="text-muted-foreground py-2 text-right font-medium">Gross Profit</th>
						<th class="text-muted-foreground py-2 text-right font-medium">Margin</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data as row (row.month)}
						<tr>
							<td class="text-foreground py-1.5">{row.month}</td>
							<td class="text-foreground py-1.5 text-right tabular-nums">{formatCurrency(row.totalRevenue)}</td>
							<td class={['py-1.5 text-right tabular-nums', row.totalGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>
								{formatCurrency(row.totalGrossProfit)}
							</td>
							<td class="text-muted-foreground py-1.5 text-right tabular-nums">{row.profitMarginPercent.toFixed(1)}%</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
