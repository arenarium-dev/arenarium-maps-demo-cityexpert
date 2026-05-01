<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SvelteMap } from 'svelte/reactivity';

	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import type { CarouselAPI } from '$lib/components/ui/carousel/context.js';

	import IconChevronLeft from '@lucide/svelte/icons/chevron-left';
	import IconChevronRight from '@lucide/svelte/icons/chevron-right';

	import { latinise } from '$lib/latinise';
	import { getSearchFurnishedLabel, getSearchPropertyLabel } from '$lib/search';
	import type { SearchItemDetails } from '$lib/types';

	let props: {
		id: string;
		data: SvelteMap<string, SearchItemDetails>;
	} = $props();

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
	let imageApi = $state<CarouselAPI>();

	let observer: IntersectionObserver | undefined;
	let element = $state<HTMLElement>();
	let shown = $state(false);

	onMount(() => {
		if (element) {
			const observer = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						shown = true;
					}
				});
			});
			observer.observe(element);
		}
	});

	onDestroy(() => {
		observer?.disconnect();
	});

	function onImageNext(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();

		imageApi?.scrollNext();
	}

	function onImagePrev(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();

		imageApi?.scrollPrev();
	}
</script>

<div bind:this={element} class="relative h-full w-full">
	{#if details !== undefined && shown}
		<a
			href={url}
			target="_blank"
			class="absolute top-0 left-0 flex h-full w-full flex-col gap-2 font-[Poppins]"
			transition:fade={{ duration: 250 }}
		>
			<div
				class="group relative w-full grow cursor-pointer overflow-hidden rounded-2xl bg-gray-100 *:transition-all *:duration-125"
			>
				<Carousel.Root setApi={(api) => (imageApi = api)} class="absolute h-full w-full">
					<Carousel.Content class="absolute ms-0 h-full w-full">
						{#each images as image}
							<Carousel.Item class="h-full w-full ps-0">
								<div class="h-full w-full">
									<img src={image} alt={image} class="h-full w-full object-cover" />
								</div>
							</Carousel.Item>
						{/each}
					</Carousel.Content>
				</Carousel.Root>
				<div
					class="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-md inset-shadow-sm"
				></div>
				<div
					class="pointer-events-none absolute top-4 left-4 h-4 text-xs font-semibold text-white select-none"
				>
					ID {details.propId}
				</div>
				<button
					class="absolute top-16 bottom-16 left-0 flex w-16 cursor-pointer items-center justify-start text-transparent group-hover:text-[#df2d43]"
					onclick={onImagePrev}
					ondblclick={onImagePrev}
				>
					<IconChevronLeft size={30} class="my-px ml-2" />
				</button>
				<button
					class="absolute top-16 right-0 bottom-16 flex w-16 cursor-pointer items-center justify-end text-transparent group-hover:text-[#df2d43]"
					onclick={onImageNext}
					ondblclick={onImageNext}
				>
					<IconChevronRight size={30} class="my-px mr-2" />
				</button>
			</div>

			<div class="flex shrink-0 flex-col gap-0.5 px-3 py-1.5">
				<div class="font-primary flex items-center pb-0.5 text-[#252525]">
					<span class="grow font-[Montserrat] text-lg leading-6 font-bold">
						{details.price} €
					</span>
					<img
						class="size-6 overflow-hidden rounded-full object-cover object-[50%_1px]"
						loading="lazy"
						decoding="async"
						src={`https://cityexpert.rs/icons/map/pin_${details.ptId}.png`}
						alt={details.ptId.toString()}
					/>
				</div>

				<div class="truncate text-sm leading-5.25 font-medium text-gray-600">
					<span class="font-semibold">{getSearchPropertyLabel(details.ptId)}</span>
					<span class="font-medium text-gray-400">-</span>
					<span class="font-medium text-gray-400">{details.street}, {details.municipality}</span>
				</div>

				<div class="truncate text-sm leading-5.25 font-semibold text-gray-600">
					<span>{getSearchFurnishedLabel(details.onsite.basInfFurnished)}</span>
					<span class="px-0.5 font-light text-gray-400">•</span>
					<span>{details.size} m²</span>
					<span class="px-0.5 font-light text-gray-400">•</span>
					<span>
						{details.structure}
						{details.structure.startsWith('1') ? 'soba' : 'sobe'}
					</span>
				</div>
			</div>
		</a>
	{:else}
		<div
			class="absolute top-0 left-0 flex h-full w-full flex-col gap-2"
			transition:fade={{ duration: 250 }}
		>
			<div class="w-full grow overflow-hidden rounded-lg bg-gray-100"></div>
			<div class="h-6 w-full rounded-lg bg-gray-100"></div>
			<div class="h-4.5 w-full rounded-lg bg-gray-100"></div>
			<div class="h-6 w-full rounded-lg bg-gray-100"></div>
		</div>
	{/if}
</div>
