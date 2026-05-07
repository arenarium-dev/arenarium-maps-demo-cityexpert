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
		class="absolute flex flex-col gap-0.5 p-1 font-[Poppins]"
		style="--spacing: {spacing}px; width: {width}px; height: {height}px;"
		transition:fade={{ duration: 250 }}
	>
		<div
			class="grow overflow-hidden rounded-[calc(3*var(--spacing))] bg-gray-100 object-cover"
			style="background-image: url({image}); background-size: cover; background-position: center;"
		></div>
		<div class="absolute right-2 bottom-2 left-2 flex items-center text-[#252525]">
			<span
				class="rounded-full bg-white/60 px-2 pt-px font-[Montserrat] text-[calc(2.5*var(--spacing))] leading-4.5 font-bold backdrop-blur-xs"
			>
				{details.price > 9999 ? `${(details.price / 1000).toFixed(1)}K` : details.price} €
			</span>
			<div class="grow"></div>
			<div class="box-content size-4 rounded-full bg-white/60 p-px pb-0.5">
				<Type type={details.ptId} />
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
		<div class="w-full grow rounded-[calc(3*var(--spacing))] bg-gray-100"></div>
	</div>
{/if}
