<script lang="ts">
	import { onMount, mount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	import Pin from '$lib/marker/Pin.svelte';
	import Tooltip from '$lib/marker/Tooltip.svelte';
	import Popup from '$lib/marker/Popup.svelte';

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	import SvgLogo from '$lib/assets/logo.svg';

	import IconSliders from '@lucide/svelte/icons/search';
	import IconPlus from '@lucide/svelte/icons/plus';
	import IconMinus from '@lucide/svelte/icons/minus';

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
	const POPUP_RADIUS = 8;

	let mapLibre: maplibregl.Map | undefined;
	let mapProvider: MaplibreProvider | undefined;
	let mapManager: MapManager | undefined;

	let searchMapMarkers: Map<string, MapMarkerProperties> = new Map();
	let searchMapItems: SvelteMap<string, MapSearchItem> = new SvelteMap();
	let searchMapItemDetails: SvelteMap<string, MapSearchItemDetails> = new SvelteMap();

	let spacing = $derived(window && window.innerWidth > 768 ? 1 : 0.8);

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

		// Create markers
		for (let i = 0; i < searchResult.length; i++) {
			const item = searchResult[i];
			const marker: MapMarkerProperties = {
				id: item.propId.toString(),
				rank: searchResult.length - i,
				lat: item.mapLat,
				lng: item.mapLng,
				pin: {
					initialize: initializePin,
					element: document.createElement('div'),
					dimensions: { radius: 12 * spacing, stroke: 2 },
					style: { stroke: '#ffffff', background: '#df2d43aa' }
				},
				tooltip: {
					initialize: initializeTooltip,
					element: document.createElement('div'),
					dimensions: { width: 104 * spacing, height: 54 * spacing, padding: 8 * spacing },
					style: { background: '#ffffff', radius: 12 * spacing }
				},
				popup: {
					initialize: initializePopup,
					element: document.createElement('div'),
					dimensions: { width: POPUP_WIDTH, height: POPUP_HEIGHT, padding: 8 * spacing },
					style: { background: '#ffffff', radius: POPUP_RADIUS }
				}
			};

			searchMapItems.set(item.propId.toString(), item);
			searchMapMarkers.set(item.propId.toString(), marker);
		}

		mapManager.updateMarkers(Array.from(searchMapMarkers.values()));
	}

	async function initializePin(id: string, element: HTMLElement): Promise<void> {
		const item = searchMapItems.get(id);
		if (!item) throw new Error('Item not found');

		mount(Pin, { target: element, props: { type: item.ptId } });
	}

	async function initializeTooltip(id: string, element: HTMLElement): Promise<void> {
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

	async function initializePopup(id: string, element: HTMLElement): Promise<void> {
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

	async function updateDetails(id: string): Promise<void> {
		const detailsUrl = `api/details?id=${id}`;
		const detailsResponse = await fetch(detailsUrl);
		if (!detailsResponse.ok) return;

		const detailsData = await detailsResponse.json();
		searchMapItemDetails.set(id, detailsData);
	}
</script>

<div class="absolute top-0 left-0 h-full w-full bg-gray-200">
	<div id="map" class="absolute top-0 left-0 h-full w-full"></div>
	<div class="absolute right-4 bottom-12">
		<ButtonGroup.Root orientation="vertical">
			<Button onclick={onZoomIn} variant="ghost" class="size-10 border border-gray-100 bg-white">
				<IconPlus class="w-4" />
			</Button>
			<Button onclick={onZoomOut} variant="ghost" class="size-10 border border-gray-100 bg-white">
				<IconMinus class="w-4" />
			</Button>
		</ButtonGroup.Root>
	</div>
</div>

<header class="absolute top-0 left-0 z-1 w-156 max-w-full bg-white p-2 shadow-sm">
	<div class="flex items-center gap-4 overflow-auto">
		<a href="https://cityexpert.rs" class="ml-2">
			<img src={SvgLogo} alt="logo" class="w-32" />
		</a>
		<Dialog.Root>
			<Dialog.Trigger
				type="button"
				class={[
					buttonVariants({ variant: 'outline' }),
					'grow cursor-pointer justify-start gap-3 border-none bg-gray-100 font-semibold text-gray-400 hover:bg-gray-200! hover:text-gray-600'
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
</header>

<div class="absolute top-12 bottom-0 left-0 w-156 overflow-hidden bg-gray-100 shadow-sm">
	<div class="scroll flex h-full w-full flex-wrap gap-4 overflow-y-scroll p-4 pr-0">
		{#each searchMapItems.values() as details}
			<div
				class="h-[{POPUP_HEIGHT}px] w-[{POPUP_WIDTH}px] rounded-xl bg-white shadow-sm transition-all duration-150 ease-in-out hover:shadow-md"
			>
				<Popup
					id={details.propId.toString()}
					height={POPUP_HEIGHT}
					width={POPUP_WIDTH}
					data={searchMapItemDetails}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.scroll {
		scrollbar-color: #aaa transparent;
		scrollbar-width: thin;
	}
</style>
