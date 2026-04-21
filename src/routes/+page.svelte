<script lang="ts">
	import { onMount, mount, onDestroy, tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { outerWidth } from 'svelte/reactivity/window';

	import Pin from '$lib/marker/Pin.svelte';
	import Tooltip from '$lib/marker/Tooltip.svelte';
	import Popup from '$lib/marker/Popup.svelte';

	import Item from '$lib/components/details/Item.svelte';

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	import SvgLogo from '$lib/assets/logo.svg';

	import IconSliders from '@lucide/svelte/icons/sliders-horizontal';
	import IconPlus from '@lucide/svelte/icons/plus';
	import IconMinus from '@lucide/svelte/icons/minus';
	import IconList from '@lucide/svelte/icons/rows-3';
	import IconMap from '@lucide/svelte/icons/map';
	import IconGlobe from '@lucide/svelte/icons/globe';
	import IconProfile from '@lucide/svelte/icons/user';
	import IconMenu from '@lucide/svelte/icons/menu';

	import { MapManager, type MapMarkerProperties } from '@arenarium/maps';
	import { MaplibreProvider } from '@arenarium/maps-integration-maplibre';
	import '@arenarium/maps/style.css';

	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import type {
		MapSearchItem,
		MapSearchItemDetails,
		MapSearchRequest,
		MapSearchResult
	} from '$lib/types';

	import { PUBLIC_ARENARIUM_MAPS_TOKEN } from '$env/static/public';

	const POPUP_WIDTH = 288;
	const POPUP_HEIGHT = 258;
	const POPUP_RADIUS = 16;

	let mapLibre: maplibregl.Map | undefined;
	let mapProvider: MaplibreProvider | undefined;
	let mapManager: MapManager | undefined;

	let searchMapMarkers: Map<string, MapMarkerProperties> = new Map();
	let searchMapItems: SvelteMap<string, MapSearchItem> = new SvelteMap();
	let searchMapItemDetails: SvelteMap<string, MapSearchItemDetails> = new SvelteMap();
	let searchMapItemDetailsLoading: Map<string, boolean> = new Map();

	let width = $derived(outerWidth.current ?? 0);
	let compact = $derived(width <= 640);
	let spacing = $derived(compact ? 0.8 : 1);

	let list = $state(false);
	let listPopupWidth = $derived(compact && width ? width - 32 : POPUP_WIDTH);
	let listPopupHeight = $derived(POPUP_HEIGHT);

	let listElement = $state<HTMLElement>();
	let listElements = $state<HTMLElement[]>([]);
	let listObserver: IntersectionObserver | undefined;

	onMount(async () => {
		// Create a maplibre provider instance
		mapProvider = new MaplibreProvider(maplibregl.Map, maplibregl.Marker, {
			container: 'map',
			zoom: 13,
			center: [20.450989, 44.811222],
			style: '/style.json'
			// Other maplibre options...
		});
		// Initialize the map manager with the provider
		mapManager = await MapManager.create(PUBLIC_ARENARIUM_MAPS_TOKEN, mapProvider, {
			pin: {
				fadeout: {
					scale: 0.2,
					color: 0
				},
				depth: 2
			}
		});
		// Access the maplibre instance for direct map interactions
		mapLibre = mapProvider.getMap();

		await search();
	});

	onDestroy(() => {
		listObserver?.disconnect();
	});

	$effect(() => {
		if (compact || !compact) {
			search();
		}
	});

	function onZoomIn() {
		if (!mapLibre) return;
		mapLibre.zoomIn();
	}

	function onZoomOut() {
		if (!mapLibre) return;
		mapLibre.zoomOut();
	}

	async function search() {
		if (!mapManager) return;

		const searchRequest: MapSearchRequest = {
			ptId: [1, 2, 5, 4],
			cityId: 1,
			rentOrSale: 'r',
			searchSource: 'regular',
			sort: 'pricedsc',
			furnished: [1],
			isFeatured: true
		};

		const searchUrl = `/api/search?req=${encodeURIComponent(JSON.stringify(searchRequest))}`;
		const searchResponse = await fetch(searchUrl);
		if (!searchResponse.ok) throw new Error('Failed to search');

		const searchResult: MapSearchResult = await searchResponse.json();

		// Clear existing markers
		searchMapMarkers.clear();
		searchMapItems.clear();
		searchMapItemDetails.clear();

		// Clear map markers
		mapManager.clear();

		// Create markers
		for (let i = 0; i < searchResult.length; i++) {
			const item = searchResult[i];
			const marker: MapMarkerProperties = {
				id: item.propId.toString(),
				rank: searchResult.length - i,
				lat: item.mapLat,
				lng: item.mapLng,
				pin: {
					initialize: onInitializePin,
					element: document.createElement('div'),
					dimensions: { radius: 12 * spacing, stroke: 2 },
					style: { stroke: '#ffffff', background: '#df2d43aa' }
				},
				tooltip: {
					initialize: onInitializeTooltip,
					element: document.createElement('div'),
					dimensions: { width: 104 * spacing, height: 54 * spacing, padding: 8 * spacing },
					style: { background: '#ffffff', radius: 12 * spacing }
				},
				popup: {
					initialize: onInitializePopup,
					element: document.createElement('div'),
					dimensions: { width: POPUP_WIDTH, height: POPUP_HEIGHT, padding: 8 * spacing },
					style: { background: '#ffffff', radius: POPUP_RADIUS }
				}
			};

			searchMapItems.set(item.propId.toString(), item);
			searchMapMarkers.set(item.propId.toString(), marker);
		}

		// Update map markers
		mapManager.updateMarkers(Array.from(searchMapMarkers.values()));

		// Wait for the next tick to ensure elements are in the DOM
		await tick();

		// Disconnect the list observer before re-creating it
		listObserver?.disconnect();

		// Create the list observer
		if (listElement) {
			listObserver = new IntersectionObserver(onListObserve, {
				root: listElement,
				threshold: 0
			});

			console.log('Connected list observer to:', listElements.length);
			// Observe list elements for intersection changes
			for (const element of listElements) {
				listObserver.observe(element);
			}
		}
	}

	async function onInitializePin(id: string, element: HTMLElement): Promise<void> {
		const item = searchMapItems.get(id);
		if (!item) throw new Error('Item not found');

		mount(Pin, { target: element, props: { type: item.ptId } });
	}

	async function onInitializeTooltip(id: string, element: HTMLElement): Promise<void> {
		const marker = searchMapMarkers.get(id);
		if (!marker) throw new Error('Marker not found');

		const dimensions = marker.tooltip?.dimensions;
		if (!dimensions) throw new Error('Tooltip style not found');

		const width = dimensions.width;
		const height = dimensions.height;
		const data = searchMapItemDetails;

		mount(Tooltip, {
			target: element,
			props: { id, spacing, width, height, data }
		});

		if (searchMapItemDetails.get(id) === undefined) await updateDetails(id);
	}

	async function onInitializePopup(id: string, element: HTMLElement): Promise<void> {
		const marker = searchMapMarkers.get(id);
		if (!marker) throw new Error('Marker not found');

		const dimensions = marker.popup?.dimensions;
		if (!dimensions) throw new Error('Popup style not found');

		const width = dimensions.width;
		const height = dimensions.height;
		const data = searchMapItemDetails;

		mount(Popup, {
			target: element,
			props: { id, spacing, width, height, data }
		});

		if (searchMapItemDetails.get(id) === undefined) await updateDetails(id);
	}

	function onListObserve(entries: IntersectionObserverEntry[]) {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				const id = entry.target.getAttribute('data-id');
				if (id) updateDetails(id);
			}
		}
	}

	async function updateDetails(id: string): Promise<void> {
		const loading = searchMapItemDetailsLoading.get(id) ?? false;
		if (loading) return;

		const exists = searchMapItemDetails.has(id);
		if (exists) return;

		try {
			searchMapItemDetailsLoading.set(id, true);

			const url = `api/details?id=${id}`;
			const response = await fetch(url);
			if (!response.ok) return;

			const details = await response.json();
			searchMapItemDetails.set(id, details);
		} finally {
			searchMapItemDetailsLoading.set(id, false);
		}
	}
</script>

<div
	bind:this={listElement}
	class={{
		'scroll absolute top-15 right-0 bottom-15 left-0 z-1 overflow-y-scroll bg-white sm:top-0 sm:bottom-0 sm:z-0': true,
		hidden: compact && !list
	}}
>
	<div
		class={{
			'absolute top-0 bottom-0 left-0 w-160': true,
			'w-full': compact
		}}
	>
		<div class="flex h-full w-full flex-wrap gap-8 p-4 sm:p-8 sm:pr-0">
			{#each searchMapItems.values() as details, i}
				<div
					bind:this={listElements[i]}
					data-id={details.propId.toString()}
					style:height={`${listPopupHeight}px`}
					style:width={`${listPopupWidth}px`}
				>
					<Item id={details.propId.toString()} data={searchMapItemDetails} />
				</div>
			{/each}
		</div>
	</div>
</div>

<div class="fixed top-15 right-0 bottom-15 left-0 sm:top-23 sm:bottom-0 sm:left-160 sm:p-8">
	<div id="map" class="absolute h-full w-full sm:rounded-xl"></div>
	<div class="absolute top-4 right-4 sm:top-12 sm:right-12">
		<ButtonGroup.Root orientation="vertical" class="rounded-lg bg-white shadow-md">
			<Button onclick={onZoomIn} variant="ghost" class="size-8 text-muted-foreground">
				<IconPlus class="w-4" />
			</Button>
			<Button onclick={onZoomOut} variant="ghost" class="size-8 text-muted-foreground">
				<IconMinus class="w-4" />
			</Button>
		</ButtonGroup.Root>
	</div>
</div>

<header class="fixed top-0 right-0 left-0 z-1 shadow-sm sm:left-160 sm:p-8 sm:shadow-none">
	<div class="flex h-15 w-full items-center gap-4 overflow-auto bg-gray-100 px-4 sm:rounded-xl">
		<a
			href="https://cityexpert.rs"
			class="flex h-8 items-center justify-center rounded-lg bg-white sm:bg-transparent"
		>
			{#if compact}
				<img src="/favicon.ico" alt="logo" class="m-2" />
			{:else}
				<img src={SvgLogo} alt="logo" class="mx-3 mt-1 w-30" />
			{/if}
		</a>
		<div class="flex grow items-center justify-center">
			<Dialog.Root>
				<Dialog.Trigger
					type="button"
					class={[
						buttonVariants({ variant: 'outline' }),
						'max-w-156 grow cursor-pointer justify-start gap-3 border-none bg-white! font-semibold text-gray-400'
					]}
				>
					<span class="grow text-start">Pretraga</span>
					<IconSliders class="w-5" strokeWidth={2.5} />
				</Dialog.Trigger>
				<Dialog.Content class="sm:max-w-100">
					<Dialog.Header>
						<Dialog.Title class="flex items-center gap-2">Pretraga</Dialog.Title>
						<Dialog.Description>
							Make changes to your profile here. Click save when you&apos;re done.
						</Dialog.Description>
					</Dialog.Header>
					<div class="grid gap-4"></div>
					<Dialog.Footer>
						<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
							Resetuj
						</Dialog.Close>
						<Button type="submit">Pretraži</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
		<Button variant="ghost" size="icon" class="hidden bg-white text-muted-foreground sm:flex">
			<IconGlobe />
		</Button>
		<Button variant="ghost" size="icon" class="hidden bg-white text-muted-foreground sm:flex">
			<IconProfile />
		</Button>
		<Button variant="ghost" size="icon" class="bg-white text-muted-foreground">
			<IconMenu />
		</Button>
	</div>
</header>

<footer class="fixed right-0 bottom-0 left-0 h-15 bg-gray-100 p-2 shadow-sm sm:hidden">
	<div class="flex h-full w-full items-center gap-4">
		<Button
			onclick={() => (list = true)}
			variant="ghost"
			class={{
				'grow bg-white transition-all duration-150': true,
				'bg-[#df2d43] text-white': list
			}}
		>
			<IconList /> Lista
		</Button>
		<Button
			onclick={() => (list = false)}
			variant="ghost"
			class={{
				'grow bg-white transition-all duration-150': true,
				'bg-[#df2d43] text-white': !list
			}}
		>
			<IconMap /> Mapa
		</Button>
	</div>
</footer>

<style>
	.scroll {
		scrollbar-color: #aaa transparent;
		scrollbar-width: thin;
	}
</style>
