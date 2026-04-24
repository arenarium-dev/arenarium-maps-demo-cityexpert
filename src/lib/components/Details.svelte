<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SvelteMap } from 'svelte/reactivity';

	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import type { CarouselAPI } from '$lib/components/ui/carousel/context.js';

	import IconChevronLeft from '@lucide/svelte/icons/chevron-left';
	import IconChevronRight from '@lucide/svelte/icons/chevron-right';

	import { latinise } from '$lib/latinise';
	import { getSearchFurnishedLabel } from '$lib/search';
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
			class="absolute top-0 left-0 flex h-full w-full flex-col gap-0.5 font-[Poppins]"
			transition:fade={{ duration: 250 }}
		>
			<div
				class="group relative mb-2 w-full grow cursor-pointer overflow-hidden rounded-lg bg-gray-100 *:transition-all *:duration-125"
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
					class="pointer-events-none absolute top-2 left-2 text-xs font-semibold text-white select-none"
				>
					ID {details.propId}
				</div>
				<button
					class="absolute top-6 bottom-6 left-1 w-10 cursor-pointer rounded-full text-transparent group-hover:text-[#df2d43]"
					onclick={onImagePrev}
					ondblclick={onImagePrev}
				>
					<IconChevronLeft size={30} class="my-px mr-0.5 justify-self-start " />
				</button>
				<button
					class="absolute top-6 right-1 bottom-6 w-10 cursor-pointer rounded-full text-transparent group-hover:text-[#df2d43]"
					onclick={onImageNext}
					ondblclick={onImageNext}
				>
					<IconChevronRight size={30} class="my-px ml-0.5 justify-self-end " />
				</button>
			</div>

			<div class="font-primary flex shrink-0 items-center px-1 text-[#252525]">
				<span class="grow font-[Montserrat] text-lg leading-6 font-bold">
					{details.price.toLocaleString().replace(',', '.')} €
				</span>
				<img
					class="size-6 overflow-hidden rounded-full object-cover object-[50%_1px]"
					loading="lazy"
					decoding="async"
					src={`https://cityexpert.rs/icons/map/pin_${details.ptId}.png`}
					alt={details.ptId.toString()}
				/>
			</div>

			<div class="font-primary shrink-0 truncate px-1 pt-1 pb-2 text-sm leading-5.25 text-gray-600">
				<span>{details.street}, {details.municipality}</span>
			</div>

			<div
				class="font-primary grid shrink-0 grid-cols-[1fr_1fr_2fr] gap-1.5 text-center text-[calc(3*var(--spacing))] leading-6 font-semibold text-gray-600"
			>
				<div class="rounded-full bg-gray-100 px-2 whitespace-nowrap">
					<span>{details.size} m²</span>
				</div>
				<!-- <div class="divider">•</div> -->
				<div class="rounded-full bg-gray-100 px-2 whitespace-nowrap">
					<span>{details.structure}</span>
				</div>
				<div class="rounded-full bg-gray-100 px-2 whitespace-nowrap">
					<span>{getSearchFurnishedLabel(details.onsite.basInfFurnished)}</span>
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
