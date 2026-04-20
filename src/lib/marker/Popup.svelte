<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SvelteMap } from 'svelte/reactivity';

	import { Spinner } from '$lib/components/ui/spinner/index.js';

	import IconChevronLeft from '@lucide/svelte/icons/chevron-left';
	import IconChevronRight from '@lucide/svelte/icons/chevron-right';

	import type { MapSearchItemDetails } from '$lib/types';
	import { latinise } from '$lib/latinise';

	let props: {
		id: string;
		width: number;
		height: number;
		data: SvelteMap<string, MapSearchItemDetails>;
	} = $props();

	let width = untrack(() => props.width);
	let height = untrack(() => props.height);
	let details = $derived(props.data.get(props.id));

	let contract = $derived(details?.rentOrSale === 'r' ? 'izdavanje' : 'prodaja');
	let city = $derived.by(() => {
		switch (details?.cityId) {
			case 1:
				return 'beograd';
			case 2:
				return 'novi-sad';
			case 3:
				return 'niš';
			default:
				return;
		}
	});
	let id = $derived(details?.propId);
	let type = $derived.by(() => {
		switch (details?.ptId) {
			case 1:
				return 'stan';
			case 2:
				return 'kuca';
			case 3:
				return 'stan-u-kuci';
			case 4:
				return 'lokal';
			case 5:
				return 'poslovni-prostor';
			default:
				return;
		}
	});
	let street = $derived(
		latinise(details?.street ?? '')
			.toLowerCase()
			.replaceAll(' ', '-')
	);
	let municipality = $derived(
		latinise(details?.municipality ?? '')
			.toLowerCase()
			.replaceAll(' ', '-')
	);
	let url = $derived(
		`https://cityexpert.rs/${contract}-nekretnina/${city}/${id}/${type}-${street}-${municipality}`
	);

	let imageIndex = $state(0);
	let imageLoading = $state(false);
	let imageLoaded = $state(false);
	let images = $derived.by<string[]>(() => {
		const array: string[] = [];

		if (details?.onsite) {
			const propId = details.propId;

			if (details.onsite.imageFiles !== undefined) {
				for (const file of details.onsite.imageFiles) {
					const id = Math.floor(propId / 1e3) * 1e3;
					const path = file.toLowerCase().replaceAll(' ', '_');
					const url = `https://img.cityexpert.rs/properties/470x/${id}/${propId}/slike/${path}`;
					array.push(url);
				}
			}

			if (details.onsite.imgFiles !== undefined) {
				for (const file of details.onsite.imgFiles) {
					const path = file.toLowerCase().replaceAll(' ', '_');
					const url = `https://img.cityexpert.rs/sites/default/files/styles/470x/public/image/${path}`;
					array.push(url);
				}
			}
		}

		return array;
	});
	let image = $derived(images[imageIndex]);

	function onImageNext(e: Event) {
		e.stopPropagation();

		if (images.length === 0) return;
		imageLoaded = false;
		imageIndex = (imageIndex + 1) % images.length;
		setTimeout(() => (imageLoading = true), 100);
	}

	function onImagePrev(e: Event) {
		e.stopPropagation();

		if (images.length === 0) return;
		imageLoaded = false;
		imageIndex = (imageIndex - 1 + images.length) % images.length;
		setTimeout(() => (imageLoading = true), 100);
	}

	function onImageLoad() {
		imageLoaded = true;
		imageLoading = false;
	}

	function onImageClick(e: Event) {
		e.stopPropagation();
	}
</script>

<a
	href={url}
	target="_blank"
	class="relative block"
	style:width={width + 'px'}
	style:height={height + 'px'}
>
	{#if details}
		<div
			class="absolute top-0 left-0 flex h-full w-full flex-col gap-0.5 p-1.5 font-[Poppins]"
			transition:fade={{ duration: 250 }}
		>
			<div
				class="group relative mb-2 aspect-video w-full grow cursor-pointer overflow-hidden rounded-lg bg-gray-100 *:transition-all *:duration-125"
			>
				{#if images.length > 0}
					{#if image}
						<img
							src={image}
							alt={image}
							onload={onImageLoad}
							onerror={onImageLoad}
							class="object-contain"
						/>
					{/if}
					{#if imageLoading && !imageLoaded}
						<div
							class="absolute top-0 left-0 flex h-full w-full items-center justify-center rounded-lg bg-white/25 backdrop-blur-xs"
							transition:fade={{ duration: 100 }}
						>
							<Spinner class="size-6" />
						</div>
					{/if}
					<button
						class="absolute bottom-1 left-1 size-6 cursor-pointer rounded-full text-transparent group-hover:bg-white/25 group-hover:text-black"
						onclick={onImagePrev}
						ondblclick={onImagePrev}
					>
						<IconChevronLeft size={22} class="my-px mr-0.5 hover:text-[#df2d43]" />
					</button>
					<button
						class="absolute right-1 bottom-1 size-6 cursor-pointer rounded-full text-transparent group-hover:bg-white/25 group-hover:text-black"
						onclick={onImageNext}
						ondblclick={onImageNext}
					>
						<IconChevronRight size={22} class="my-px ml-0.5 hover:text-[#df2d43]" />
					</button>
					<div class="absolute right-7 bottom-1 left-7 flex items-center justify-center">
						<div
							class="flex h-6 items-center justify-center rounded-full px-3 font-semibold text-transparent group-hover:bg-white/25 group-hover:text-black"
						>
							<span class="text-xs">{imageIndex + 1} od {images.length}</span>
						</div>
					</div>
				{/if}
				<div
					class="pointer-events-none absolute top-2 left-2 text-xs font-semibold text-white select-none"
				>
					ID {details.propId}
				</div>
			</div>

			<div class="font-primary flex items-center px-1 text-[#252525]">
				<span class="grow font-[Montserrat] text-[calc(4*var(--spacing))] leading-6 font-bold"
					>{details.price.toLocaleString().replace(',', '.')} €</span
				>
				<img
					class="size-6 overflow-hidden rounded-full object-cover object-[50%_1px]"
					loading="lazy"
					src={`https://cityexpert.rs/icons/map/pin_${details.ptId}.png`}
					alt={details.ptId.toString()}
				/>
			</div>

			<div
				class="font-primary truncate px-1 pb-2 text-[calc(3*var(--spacing))] leading-5.25 text-gray-600"
			>
				<span>{details.street}, {details.municipality}</span>
			</div>

			<div
				class="font-primary grid grid-cols-[1fr_1fr_2fr] gap-1.5 text-center text-[calc(3*var(--spacing))] leading-6 font-semibold text-gray-600"
			>
				<div class="rounded-full bg-gray-100 px-2 whitespace-nowrap">
					<span>{details.size} m²</span>
				</div>
				<!-- <div class="divider">•</div> -->
				<div class="rounded-full bg-gray-100 px-2 whitespace-nowrap">
					<span>{details.structure}</span>
				</div>
				<div class="rounded-full bg-gray-100 px-2 whitespace-nowrap">
					<span>Namešten</span>
				</div>
			</div>
		</div>
	{:else}
		<div
			class="absolute top-0 left-0 flex h-full w-full flex-col gap-2 p-1.5"
			transition:fade={{ duration: 250 }}
		>
			<div class="w-full grow overflow-hidden rounded-lg bg-gray-100"></div>
			<div class="h-6 w-full rounded-lg bg-gray-100"></div>
			<div class="h-4.5 w-full rounded-lg bg-gray-100"></div>
			<div class="h-6 w-full rounded-lg bg-gray-100"></div>
		</div>
	{/if}
</a>
