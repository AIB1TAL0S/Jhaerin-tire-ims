<script lang="ts">
	import { Chart, Spline, Axis } from 'layerchart';
	import type { TrendDataPoint } from '$lib/server/models/sales';

	interface Props {
		data: TrendDataPoint[];
	}

	let { data }: Props = $props();

	// LayerChart needs flat data with a single y key — create two series
	const revenueData = $derived(data.map((d) => ({ label: d.label, value: d.revenue })));
	const profitData = $derived(data.map((d) => ({ label: d.label, value: d.grossProfit })));
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-foreground text-sm font-semibold">Revenue & Gross Profit</h3>
		<div class="flex items-center gap-4 text-xs">
			<span class="flex items-center gap-1.5">
				<span class="bg-primary h-2 w-4 rounded-full"></span>
				<span class="text-muted-foreground">Revenue</span>
			</span>
			<span class="flex items-center gap-1.5">
				<span class="h-2 w-4 rounded-full bg-green-500"></span>
				<span class="text-muted-foreground">Gross Profit</span>
			</span>
		</div>
	</div>

	{#if data.length === 0}
		<div class="text-muted-foreground flex h-48 items-center justify-center text-sm">
			No trend data for this period.
		</div>
	{:else}
		<div class="h-48 w-full">
			<Chart
				data={revenueData}
				x="label"
				y="value"
				padding={{ top: 8, bottom: 32, left: 56, right: 8 }}
			>
				<Axis placement="bottom" />
				<Axis placement="left" />
				<Spline class="stroke-primary stroke-2" />
			</Chart>
		</div>
		<!-- Profit line overlaid separately — LayerChart renders one series per Chart -->
		<div class="h-48 w-full -mt-48 pointer-events-none opacity-70">
			<Chart
				data={profitData}
				x="label"
				y="value"
				padding={{ top: 8, bottom: 32, left: 56, right: 8 }}
			>
				<Spline class="stroke-green-500 stroke-2" />
			</Chart>
		</div>
	{/if}
</div>
