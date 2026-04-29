<script lang="ts">
	import { Chart, Bars, Axis } from 'layerchart';
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
</script>

<div class="space-y-3">
	<!-- Granularity toggle -->
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
		<div class="h-48 w-full">
			<Chart
				{data}
				x="label"
				y="value"
				padding={{ top: 8, bottom: 32, left: 40, right: 8 }}
			>
				<Axis placement="bottom" />
				<Axis placement="left" />
				<Bars class="fill-primary/80 hover:fill-primary" radius={2} />
			</Chart>
		</div>
	{/if}
</div>
