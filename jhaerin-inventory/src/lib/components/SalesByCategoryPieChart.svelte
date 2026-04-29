<script lang="ts">
	import { Chart, Pie, Arc } from 'layerchart';
	import type { CategoryDataPoint } from '$lib/server/models/sales';

	interface Props {
		data: CategoryDataPoint[];
	}

	let { data }: Props = $props();

	// Colour palette cycling through chart CSS variables
	const COLOURS = [
		'var(--color-chart-1)',
		'var(--color-chart-2)',
		'var(--color-chart-3)',
		'var(--color-chart-4)',
		'var(--color-chart-5)'
	];

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
			<div class="h-40 w-40 shrink-0">
				<Chart
					data={data}
					x="category"
					y="value"
					padding={{ top: 4, bottom: 4, left: 4, right: 4 }}
				>
					<Pie innerRadius={0.55} let:arcs>
						{#each arcs as arc, i (arc.data.category)}
							<Arc
								{arc}
								fill={COLOURS[i % COLOURS.length]}
								class="stroke-card stroke-2"
							/>
						{/each}
					</Pie>
				</Chart>
			</div>

			<!-- Legend -->
			<ul class="flex-1 space-y-1.5 text-sm">
				{#each data.slice(0, 8) as item, i (item.category)}
					<li class="flex items-center justify-between gap-2">
						<span class="flex items-center gap-2">
							<span
								class="h-2.5 w-2.5 shrink-0 rounded-full"
								style="background: {COLOURS[i % COLOURS.length]}"
							></span>
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
