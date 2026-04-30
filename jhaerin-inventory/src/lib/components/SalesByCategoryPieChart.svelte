<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { PieChart } from 'layerchart';
	import { browser } from '$app/environment';
	import type { CategoryDataPoint } from '$lib/server/models/sales';

	interface Props {
		data: CategoryDataPoint[];
	}

	let { data }: Props = $props();

	// Assign chart colors to each category
	const CHART_COLORS = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)'
	];

	const coloredData = $derived(
		data.map((d, i) => ({
			...d,
			color: CHART_COLORS[i % CHART_COLORS.length]
		}))
	);

	const chartConfig = $derived(
		Object.fromEntries(
			data.map((d, i) => [
				d.category,
				{ label: d.category, color: CHART_COLORS[i % CHART_COLORS.length] }
			])
		) as Chart.ChartConfig
	);

	const total = $derived(data.reduce((s, d) => s + d.value, 0));
</script>

<div class="space-y-3">
	<h3 class="text-foreground text-sm font-semibold">Sales by Brand</h3>

	{#if data.length === 0}
		<div class="text-muted-foreground flex h-48 items-center justify-center text-sm">
			No category data for this period.
		</div>
	{:else}
		<div class="flex items-center gap-6">
			<!-- Donut chart -->
			{#if browser}
				<Chart.Container config={chartConfig} class="mx-auto aspect-square h-40 shrink-0">
					<PieChart
						data={coloredData}
						key="category"
						value="value"
						c="color"
						innerRadius={50}
						padding={8}
						props={{ pie: { motion: 'tween' } }}
					>
						{#snippet tooltip()}
							<Chart.Tooltip hideLabel />
						{/snippet}
					</PieChart>
				</Chart.Container>
			{:else}
				<div class="bg-muted mx-auto aspect-square h-40 shrink-0 animate-pulse rounded-full"></div>
			{/if}

			<!-- Legend -->
			<ul class="flex-1 space-y-1.5 text-sm">
				{#each coloredData.slice(0, 8) as item (item.category)}
					<li class="flex items-center justify-between gap-2">
						<span class="flex items-center gap-2">
							<span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background: {item.color}"></span>
							<span class="text-foreground truncate">{item.category}</span>
						</span>
						<span class="text-muted-foreground tabular-nums">
							{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
