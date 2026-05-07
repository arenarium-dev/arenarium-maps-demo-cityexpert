<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SvelteMap } from 'svelte/reactivity';

	import Type from '$lib/components/Type.svelte';

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
		class="absolute flex flex-col font-[Poppins]"
		style="--spacing: {spacing}px; width: {width}px; height: {height}px;"
		transition:fade={{ duration: 250 }}
	>
		<div class="font-primary flex h-full items-center pr-1 pl-2 text-[#252525]">
			<span class="grow font-[Montserrat] text-[calc(3*var(--spacing))] leading-4 font-bold">
				{details.price > 9999 ? `${(details.price / 1000).toFixed(1)}K` : details.price} €
			</span>
			<div class="size-4">
				<Type type={details.ptId} />
			</div>
		</div>
	</div>
{:else}
	<div
		class="absolute flex flex-col p-1"
		style="--spacing: {spacing}px;"
		style:width="{width}px"
		style:height="{height}px"
		transition:fade={{ duration: 250 }}
	>
		<div class="h-full w-full rounded-lg bg-gray-100"></div>
	</div>
{/if}
