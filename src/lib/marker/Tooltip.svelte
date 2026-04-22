<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SvelteMap } from 'svelte/reactivity';

	import type { SearchItemDetails } from '$lib/types';

	let props: {
		id: string;
		spacing: number;
		width: number;
		height: number;
		data: SvelteMap<string, SearchItemDetails>;
	} = $props();

	let spacing = untrack(() => props.spacing * 4);
	let width = untrack(() => props.width);
	let height = untrack(() => props.height);
	let details = $derived(props.data.get(props.id));
</script>

{#if details}
	<div
		class="absolute flex flex-col gap-1.5 p-1 font-[Poppins]"
		style="--spacing: {spacing}px; width: {width}px; height: {height}px;"
		transition:fade={{ duration: 250 }}
	>
		<div class="font-primary flex items-center pl-1 text-[#252525]">
			<span class="grow font-[Montserrat] text-[calc(3.5*var(--spacing))] leading-5 font-bold"
				>{details.price.toLocaleString().replace(',', '.')} €</span
			>
			<img
				class="h-5 w-5 overflow-hidden rounded-full object-cover object-[50%_1px]"
				loading="lazy"
				src={`https://cityexpert.rs/icons/map/pin_${details.ptId}.png`}
				alt={details.ptId.toString()}
			/>
		</div>
		<div
			class="font-primary grid grid-cols-[auto_1fr] items-stretch justify-stretch gap-1.5 text-[calc(2.5*var(--spacing))] leading-5 font-semibold text-gray-600"
		>
			<div class="rounded-full bg-gray-100 px-2 text-center whitespace-nowrap">
				<span>{details.size} m²</span>
			</div>
			<!-- <div class="divider">•</div> -->
			<div class="rounded-full bg-gray-100 px-2 text-center whitespace-nowrap">
				<span>{details.structure.slice(0, 3)}</span>
			</div>
		</div>
	</div>
{:else}
	<div
		class="absolute flex flex-col gap-1.5 p-1"
		style="--spacing: {spacing}px;"
		style:width="{width}px"
		style:height="{height}px"
		transition:fade={{ duration: 250 }}
	>
		<div class="flex flex-col gap-1">
			<div class="h-5 w-full rounded-lg bg-gray-100"></div>
			<div class="h-5 w-full rounded-lg bg-gray-100"></div>
		</div>
	</div>
{/if}
