<script lang="ts">
	import { onMount, mount, onDestroy, tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { outerWidth } from 'svelte/reactivity/window';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	import { getDefaultSearch, getSearchLocation } from '$lib/search';

	import Pin from '$lib/marker/Pin.svelte';
	import Tooltip from '$lib/marker/Tooltip.svelte';
	import Popup from '$lib/marker/Popup.svelte';

	import Details from '$lib/components/Details.svelte';
	import Search from '$lib/components/Search.svelte';

	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';

	import SvgLogo from '$lib/assets/logo.svg';

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

	import type { SearchItem, SearchItemDetails, SearchRequest, SearchResult } from '$lib/types';

	import { PUBLIC_ARENARIUM_MAPS_TOKEN } from '$env/static/public';

	const POPUP_WIDTH = 288;
	const POPUP_HEIGHT = 258;
	const POPUP_RADIUS = 16;

	let width = $derived(outerWidth.current ?? 0);
	let compact = $derived(width <= 640);
	let spacing = $derived(compact ? 0.8 : 1);

	let mapLibre: maplibregl.Map | undefined;
	let mapProvider: MaplibreProvider | undefined;
	let mapManager: MapManager | undefined;

	let searchPage = $state<SearchRequest>();
	let searchDialog = $state<SearchRequest>();
	let searchMarkers: Map<string, MapMarkerProperties> = new Map();
	let searchItems: SvelteMap<string, SearchItem> = new SvelteMap();
	let searchItemDetails: SvelteMap<string, SearchItemDetails> = new SvelteMap();
	let searchItemDetailsLoading: Map<string, boolean> = new Map();

	let list = $state(false);
	let listElementWidth = $derived(compact && width ? width - 32 : POPUP_WIDTH);
	let listElementHeight = $derived(POPUP_HEIGHT);
	let listElement = $state<HTMLElement>();
	let listElements = $state<HTMLElement[]>([]);
	let listObserver: IntersectionObserver | undefined;

	onMount(async () => {
		// Parse the search parameter from the URL if present
		const searchParam = page.params.search;
		const search = searchParam ? JSON.parse(atob(searchParam)) : getDefaultSearch();
		searchPage = search;
		searchDialog = search;

		// Create a maplibre provider instance
		mapProvider = new MaplibreProvider(maplibregl.Map, maplibregl.Marker, {
			container: 'map',
			zoom: 13,
			center: getSearchLocation(search.cityId),
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

		// Update the search items based on the parsed or default search request
		await updateSearchItems(search);
	});

	onDestroy(() => {
		// Clean up the list observer when the component is destroyed
		listObserver?.disconnect();
	});

	$effect(() => {
		// Update search items when compact mode changes
		if (compact || !compact) {
			if (searchPage) updateSearchItems(searchPage);
		}
	});

	$effect(() => {
		// Check if the search dialog is initialized
		if (!searchDialog || !searchPage) return;

		// Compare the current search dialog with the default search and update the URL if they differ
		const oldSearch = btoa(JSON.stringify(searchPage));
		const newSearch = btoa(JSON.stringify(searchDialog));

		if (oldSearch !== newSearch) {
			// Update the map center if the cityId has changed
			if (searchPage.cityId !== searchDialog.cityId) {
				mapLibre?.jumpTo({ center: getSearchLocation(searchDialog.cityId) });
			}

			// Update the search page to the dialog state
			searchPage = searchDialog;

			// Navigate to the new search URL
			goto(`/${newSearch}`);
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

	async function onInitializePin(id: string, element: HTMLElement): Promise<void> {
		const item = searchItems.get(id);
		if (!item) throw new Error('Item not found');

		mount(Pin, { target: element, props: { type: item.ptId } });
	}

	async function onInitializeTooltip(id: string, element: HTMLElement): Promise<void> {
		const marker = searchMarkers.get(id);
		if (!marker) throw new Error('Marker not found');

		const dimensions = marker.tooltip?.dimensions;
		if (!dimensions) throw new Error('Tooltip style not found');

		const width = dimensions.width;
		const height = dimensions.height;
		const data = searchItemDetails;

		mount(Tooltip, {
			target: element,
			props: { id, spacing, width, height, data }
		});

		if (searchItemDetails.get(id) === undefined) await updateSearchDetails(id);
	}

	async function onInitializePopup(id: string, element: HTMLElement): Promise<void> {
		const marker = searchMarkers.get(id);
		if (!marker) throw new Error('Marker not found');

		const dimensions = marker.popup?.dimensions;
		if (!dimensions) throw new Error('Popup style not found');

		const width = dimensions.width;
		const height = dimensions.height;
		const data = searchItemDetails;

		mount(Popup, {
			target: element,
			props: { id, spacing, width, height, data }
		});

		if (searchItemDetails.get(id) === undefined) await updateSearchDetails(id);
	}

	function onListObserve(entries: IntersectionObserverEntry[]) {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				const id = entry.target.getAttribute('data-id');
				if (id) updateSearchDetails(id);
			}
		}
	}

	async function updateSearchItems(search: SearchRequest) {
		if (!mapManager) return;

		const searchUrl = `/api/search?req=${encodeURIComponent(JSON.stringify(search))}`;
		const searchResponse = await fetch(searchUrl);
		if (!searchResponse.ok) throw new Error('Failed to search');
		const searchResult: SearchResult = await searchResponse.json();

		// Clear existing markers
		searchMarkers.clear();
		searchItems.clear();
		searchItemDetails.clear();

		// Clear map markers
		mapManager.clear();

		// Track added coordinates to avoid duplicates
		let coordinateSet = new Set<string>();

		// Create markers
		for (let i = 0; i < searchResult.length; i++) {
			const item = searchResult[i];

			// Check if the marker with the same coordinates is already added
			const coordinateKey = item.mapLat + ',' + item.mapLng;
			if (coordinateSet.has(coordinateKey)) continue;
			coordinateSet.add(coordinateKey);

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

			searchItems.set(item.propId.toString(), item);
			searchMarkers.set(item.propId.toString(), marker);
		}

		// Update map markers
		mapManager.updateMarkers(Array.from(searchMarkers.values()));

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

			// Observe list elements for intersection changes
			for (const element of listElements) {
				if (element instanceof HTMLElement) {
					listObserver.observe(element);
				}
			}
		}
	}

	async function updateSearchDetails(id: string): Promise<void> {
		const loading = searchItemDetailsLoading.get(id) ?? false;
		if (loading) return;

		const exists = searchItemDetails.has(id);
		if (exists) return;

		try {
			searchItemDetailsLoading.set(id, true);

			const url = `api/details?id=${id}`;
			const response = await fetch(url);
			if (!response.ok) return;

			const details: SearchItemDetails = await response.json();
			searchItemDetails.set(id, details);
		} finally {
			searchItemDetailsLoading.set(id, false);
		}
	}
</script>

<div class="fixed top-0 left-0 grid h-full w-full grid-cols-[1fr_auto] bg-gray-200">
	<div class="flex h-full grow flex-col sm:gap-8 sm:p-8">
		<header
			class="z-1 flex h-15 w-full items-center gap-4 overflow-auto bg-white px-4 shadow-sm sm:rounded-xl"
		>
			<a
				href="https://cityexpert.rs"
				class="flex h-8 shrink-0 items-center justify-center rounded-lg bg-white sm:bg-transparent"
			>
				{#if compact}
					<img src="/favicon.ico" alt="logo" class="m-2" />
				{:else}
					<img src={SvgLogo} alt="logo" class="mx-3 mt-1 w-30" />
				{/if}
			</a>
			{#if searchDialog}
				<div class="flex grow items-center justify-center">
					<Search bind:search={searchDialog} />
				</div>
			{/if}
			<Button variant="ghost" size="icon" class="hidden bg-white! text-muted-foreground sm:flex">
				<IconGlobe />
			</Button>
			<Button variant="ghost" size="icon" class="hidden bg-white! text-muted-foreground sm:flex">
				<IconProfile />
			</Button>
			<Button variant="ghost" size="icon" class="bg-white! text-muted-foreground">
				<IconMenu />
			</Button>
		</header>

		<div class="relative grow">
			<div id="map" class="absolute h-full w-full sm:rounded-xl sm:border sm:shadow-sm"></div>
			<div class="absolute top-4 right-4">
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

		<footer class="z-1 h-15 w-full border-t bg-gray-100 p-2 sm:hidden">
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
	</div>

	<div
		bind:this={listElement}
		class={{
			'scroll absolute top-15 right-0 bottom-15 left-0 overflow-y-scroll bg-gray-200 sm:relative sm:top-0 sm:bottom-0 sm:z-0 sm:w-160': true,
			hidden: compact && !list
		}}
	>
		<div class="flex h-full w-full flex-wrap gap-4 p-4 sm:gap-8 sm:px-0 sm:py-8">
			{#each searchItems.values() as details, i}
				<div
					bind:this={listElements[i]}
					data-id={details.propId.toString()}
					style:height={`${listElementHeight}px`}
					style:width={`${listElementWidth}px`}
					class="rounded-xl bg-white p-2 shadow-sm transition-all duration-150 hover:shadow-md"
				>
					<Details id={details.propId.toString()} data={searchItemDetails} />
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.scroll {
		scrollbar-color: #aaa transparent;
		scrollbar-width: thin;
	}
</style>
