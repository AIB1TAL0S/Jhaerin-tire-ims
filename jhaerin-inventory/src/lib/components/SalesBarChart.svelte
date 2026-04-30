<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { BarChart } from 'layerchart';
	import { scaleBand } from 'd3-scale';
	import { browser } from '$app/environment';
	import type { ChartDataPoint } from '$lib/server/models/sales';

	interface Props {
		data: ChartDataPoint[];
		granularity: 'daily' | 'weekly' | 'monthly';
		onGranularityChange: (g: 'daily' | 'weekly' | 'monthly') => void;
	}

	let { data, granularity, onGranularityChange }: Props = $props();

	const granularities: { value: 'daily' | 'weekly' | 'monthly'; label: string }[] = [
		{ value: 'daily', label: 'Daily' },
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' }
	];

	const chartConfig = {
		value: {
			label: 'Units Sold',
			color: 'var(--chart-1)'
		}
	} satisfies Chart.ChartConfig;
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-foreground text-sm font-semibold">Sales Volume</h3>
		<div class="bg-muted flex rounded-lg p-0.5">
			{#each granularities as g (g.value)}
				<button
					type="button"
					onclick={() => onGranularityChange(g.value)}
					class={[
						'rounded-md px-3 py-1 text-xs font-medium transition-colors',
						granularity === g.value
							? 'bg-card text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'
					].join(' ')}
				>
					{g.label}
				</button>
			{/each}
		</div>
	</div>

	{#if data.length === 0}
		<div class="text-muted-foreground flex h-48 items-center justify-center text-sm">
			No sales data for this period.
		</div>
	{:else}
		{#if browser}
			<Chart.Container config={chartConfig} class="h-48 w-full">
				<BarChart
					{data}
					x="label"
					xScale={scaleBand().padding(0.2)}
					axis="x"
					series={[{ key: 'value', label: 'Units Sold', color: chartConfig.value.color }]}
					props={{
						bars: { stroke: 'none', rounded: 'all', radius: 4 },
						xAxis: { format: (d: string) => d.length > 8 ? d.slice(0, 8) : d }
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
	{/if}
</div>
