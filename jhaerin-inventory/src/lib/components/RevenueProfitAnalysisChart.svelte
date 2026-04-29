<script lang="ts">
	import { Chart, Bars, Spline, Axis } from 'layerchart';
	import type { MonthlyFinancialSummary } from '$lib/server/models/sales';

	interface Props {
		data: MonthlyFinancialSummary[];
	}

	let { data }: Props = $props();

	// Flatten to two series for LayerChart
	const revenueData = $derived(data.map((d) => ({ label: d.month, value: d.totalRevenue })));
	const profitData = $derived(data.map((d) => ({ label: d.month, value: d.totalGrossProfit })));
	const marginData = $derived(data.map((d) => ({ label: d.month, value: d.profitMarginPercent })));
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-foreground text-sm font-semibold">Revenue vs Gross Profit</h3>
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
			No financial data for this period.
		</div>
	{:else}
		<!-- Revenue bars -->
		<div class="h-48 w-full">
			<Chart
				data={revenueData}
				x="label"
				y="value"
				padding={{ top: 8, bottom: 32, left: 64, right: 8 }}
			>
				<Axis placement="bottom" />
				<Axis placement="left" />
				<Bars class="fill-primary/60 hover:fill-primary" radius={2} />
			</Chart>
		</div>

		<!-- Profit line overlay -->
		<div class="pointer-events-none -mt-48 h-48 w-full opacity-90">
			<Chart
				data={profitData}
				x="label"
				y="value"
				padding={{ top: 8, bottom: 32, left: 64, right: 8 }}
			>
				<Spline class="stroke-green-500 stroke-2" />
			</Chart>
		</div>

		<!-- Margin % table -->
		{#if data.length > 0}
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
								<td class="text-foreground py-1.5 text-right tabular-nums">
									{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(row.totalRevenue)}
								</td>
								<td class={['py-1.5 text-right tabular-nums', row.totalGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>
									{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(row.totalGrossProfit)}
								</td>
								<td class="text-muted-foreground py-1.5 text-right tabular-nums">
									{row.profitMarginPercent.toFixed(1)}%
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
