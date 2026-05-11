<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SvelteMap } from 'svelte/reactivity';

	import Type from '$lib/components/Type.svelte';

	import type { SearchItemDetails } from '$lib/types';
	import { getSearchFurnishedLabel } from '$lib/search';

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
	let image = $derived.by(() => {
		if (!details) return null;
		const id = Math.floor(details.propId / 1e3) * 1e3;
		const path = details.onsite.coverImage.toLowerCase().replaceAll(' ', '_');
		const url = `https://img.cityexpert.rs/properties/470x/${id}/${details.propId}/slike/${path}`;
		return url;
	});
</script>

{#if details}
	<div
		class="absolute flex items-stretch gap-2 p-1 font-[Poppins]"
		style="--spacing: {spacing}px; width: {width}px; height: {height}px;"
		transition:fade={{ duration: 250 }}
	>
		<div
			class="aspect-4/3 overflow-hidden rounded-[calc(2*var(--spacing))] bg-gray-100 object-cover"
			style="background-image: url({image}); background-size: cover; background-position: center;"
		></div>
		<div class="flex grow flex-col gap-0.5">
			<div class="font-primary flex items-center text-[#252525]">
				<span class="grow font-[Montserrat] text-[calc(3.5*var(--spacing))] leading-5 font-bold">
					{details.price > 9999 ? `${(details.price / 1000).toFixed(1)}K` : details.price} €
				</span>
				<div class="size-4">
					<Type type={details.ptId} />
				</div>
			</div>
			<div
				class="font-primary text-[calc(2.75*var(--spacing))] leading-4 font-semibold text-gray-600"
			>
				{getSearchFurnishedLabel(details.onsite.basInfFurnished)}
			</div>
			<div
				class="font-primary flex items-stretch justify-stretch gap-1 text-[calc(2.75*var(--spacing))] leading-4 font-semibold text-gray-600"
			>
				<span>{details.size > 999 ? `${(details.size / 1000).toFixed(1)}K` : details.size} m²</span>
				<span class="text-gray-400">•</span>
				<span>{details.structure.slice(0, 3)}</span>
			</div>
		</div>
	</div>
{:else}
	<div
		class="absolute flex gap-2 p-1"
		style="--spacing: {spacing}px;"
		style:width="{width}px"
		style:height="{height}px"
		transition:fade={{ duration: 250 }}
	>
		<div class="aspect-4/3 rounded-lg bg-gray-100"></div>
		<div class="flex grow flex-col gap-1">
			<div class="h-5 w-full rounded-lg bg-gray-100"></div>
			<div class="h-4 w-full rounded-lg bg-gray-100"></div>
			<div class="h-4 w-full rounded-lg bg-gray-100"></div>
		</div>
	</div>
{/if}
