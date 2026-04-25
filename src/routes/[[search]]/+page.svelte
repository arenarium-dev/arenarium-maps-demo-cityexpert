<script lang="ts">
	import { onMount, mount, onDestroy, tick, untrack } from 'svelte';
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

	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

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

	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import type { SearchItem, SearchItemDetails, SearchRequest, SearchResult } from '$lib/types';

	import { PUBLIC_ARENARIUM_MAPS_TOKEN } from '$env/static/public';

	const PIN_RADIUS = 12;
	const PIN_STROKE = 2;

	const TOOLTIP_WIDTH = 104;
	const TOOLTIP_HEIGHT = 54;
	const TOOLTIP_RADIUS = 8;

	const POPUP_WIDTH = 288;
	const POPUP_HEIGHT = (POPUP_WIDTH * 3) / 3;
	const POPUP_RADIUS = 12;

	let width = $derived(outerWidth.current ?? 0);
	let compact = $derived(width && width <= 470 + 32);
	let spacing = $derived(compact ? 0.8 : 1);

	let mapLibre: maplibregl.Map | undefined;
	let mapProvider: MaplibreProvider | undefined;
	let mapManager = $state<MapManager>();

	let searchPage = $derived<SearchRequest>(getSearchFromPath(page.params.search));
	let searchDialog = $state<SearchRequest>(getSearchFromPath(page.params.search));
	let searchMarkers: Map<string, MapMarkerProperties> = new Map();
	let searchItems: SvelteMap<string, SearchItem> = new SvelteMap();
	let searchItemDetails: SvelteMap<string, SearchItemDetails> = new SvelteMap();
	let searchItemDetailsLoading: Map<string, boolean> = new Map();

	let list = $state(false);
	let listPopupWidth = $derived(compact && width ? width - 32 : POPUP_WIDTH);
	let listPopupHeight = $derived((listPopupWidth * 3) / 3);
	let listElement = $state<HTMLElement>();
	let listElements = $state<HTMLElement[]>([]);
	let listObserver: IntersectionObserver | undefined;

	let dialogOpen = $state(false);
	let dialogId = $state<string>('');

	onMount(async () => {
		// Create a maplibre provider instance
		mapProvider = new MaplibreProvider(maplibregl.Map, maplibregl.Marker, {
			container: 'map',
			zoom: 13,
			center: getSearchLocation(searchPage.cityId),
			style: '/style.json'
			// Other maplibre options...
		});
		// Access the maplibre instance for direct map interactions
		mapLibre = mapProvider.getMap();
		// Initialize the map manager with the provider
		mapManager = await MapManager.create(PUBLIC_ARENARIUM_MAPS_TOKEN, mapProvider, {
			pin: {
				fadeout: {
					scale: 0.25,
					color: 0
				},
				depth: 2
			}
		});
	});

	onDestroy(() => {
		// Clean up the list observer when the component is destroyed
		listObserver?.disconnect();
	});

	$effect(() => {
		// Check if the search dialog is changed
		if (searchDialog) {
			untrack(() => {
				// Update the map center if the cityId has changed
				if (searchPage.cityId !== searchDialog.cityId) {
					mapLibre?.jumpTo({ center: getSearchLocation(searchDialog.cityId) });
				}

				// Compare the current search dialog with the default search and update the URL if they differ
				const oldSearch = getPathFromSearch(searchPage);
				const newSearch = getPathFromSearch(searchDialog);
				// Navigate to the new search URL
				if (oldSearch !== newSearch) goto(`/${newSearch}`);
			});
		}
	});

	$effect(() => {
		// When the search page changes or compact mode changes
		if (searchPage && mapManager) {
			untrack(() => {
				// Update the map center if the cityId has changed
				if (searchPage.cityId !== searchDialog.cityId) {
					mapLibre?.jumpTo({ center: getSearchLocation(searchPage.cityId) });
				}

				// Update the search dialog to match the search page
				searchDialog = searchPage;
				// Update the search items
				updateSearchItems(searchPage);
			});
		}
	});

	function getSearchFromPath(path: string | undefined): SearchRequest {
		return path ? JSON.parse(decodeURIComponent(atob(path))) : getDefaultSearch();
	}

	function getPathFromSearch(search: SearchRequest): string {
		return btoa(encodeURIComponent(JSON.stringify(search)));
	}

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
		if (!listElement) return;

		for (const entry of entries) {
			if (entry.isIntersecting) {
				const id = entry.target.getAttribute('data-id');
				if (!id) continue;

				// Get the scroll position before checking if entries are intersecting
				let scroll = listElement.scrollTop;
				let scrollDelay = 100;

				const processObservation = async () => {
					let scrolling = listElement?.scrollTop != scroll;
					if (scrolling == false) {
						await updateSearchDetails(id);
					} else {
						scroll = listElement?.scrollTop ?? scroll;
						setTimeout(processObservation, scrollDelay);
					}
				};
				setTimeout(processObservation, scrollDelay);
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
					dimensions: { radius: PIN_RADIUS * spacing, stroke: PIN_STROKE * spacing },
					style: { stroke: '#ffffff', background: '#df2d4344' }
				},
				tooltip: {
					initialize: onInitializeTooltip,
					element: document.createElement('div'),
					dimensions: {
						width: TOOLTIP_WIDTH * spacing,
						height: TOOLTIP_HEIGHT * spacing,
						padding: TOOLTIP_RADIUS * spacing
					},
					style: {
						background: '#ffffff',
						radius: 12 * spacing,
						filter: 'drop-shadow(rgba(0, 0, 0, 0.25) 0px 2px 2px)'
					}
				}
			};

			if (compact === false) {
				marker.popup = {
					initialize: onInitializePopup,
					element: document.createElement('div'),
					dimensions: { width: POPUP_WIDTH, height: POPUP_HEIGHT, padding: 8 * spacing },
					style: { background: '#ffffff', radius: POPUP_RADIUS }
				};
			} else {
				marker.tooltip.element.addEventListener('click', () => {
					dialogId = marker.id;
					dialogOpen = true;
				});
			}

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

{#if width > 0}
	<div
		class={{
			'fixed top-0 left-0 grid h-full w-full  bg-[#f2f2f2]': true,
			'grid-rows-[60px_1fr] gap-8 p-8': !compact,
			'grid-rows-[60px_1fr_60px]': compact
		}}
	>
		<header
			class={{
				'z-1 flex h-full w-full shrink-0 items-center gap-4 overflow-auto bg-white px-4 shadow-sm': true,
				'rounded-xl': !compact
			}}
		>
			<a
				href="https://cityexpert.rs"
				class="flex h-8 shrink-0 items-center justify-center rounded-lg bg-white"
			>
				{#if compact}
					<img src="/favicon.ico" alt="logo" class="m-2" />
				{:else}
					<img src={SvgLogo} alt="logo" class="mx-3 mt-1 w-30" />
				{/if}
			</a>
			<div class="flex grow items-center justify-center">
				<Search {searchPage} bind:searchDialog />
			</div>
			{#if !compact}
				<Button variant="ghost" size="icon" class=" bg-white! text-muted-foreground">
					<IconGlobe />
				</Button>
				<Button variant="ghost" size="icon" class=" bg-white! text-muted-foreground">
					<IconProfile />
				</Button>
			{/if}
			<Button variant="ghost" size="icon" class="bg-white! text-muted-foreground">
				<IconMenu />
			</Button>
		</header>

		<div class="relative flex min-h-0 gap-8">
			<div
				class={{
					'relative grow bg-white ': true,
					'rounded-xl border p-4 shadow-sm': !compact
				}}
			>
				<div id="map" class={{ 'absolute h-full w-full': true, 'rounded-md': !compact }}></div>
				<div
					class={{
						'pointer-events-none absolute inset-shadow-sm': true,
						'top-4 right-4 bottom-4 left-4 rounded-md': !compact,
						'top-0 right-0 bottom-0 left-0': compact
					}}
				></div>
				<div
					class={{
						'absolute top-8 right-8': !compact,
						'absolute top-4 right-4': compact
					}}
				>
					<ButtonGroup.Root orientation="vertical" class="rounded-md bg-white shadow-md">
						<Button onclick={onZoomIn} variant="ghost" class="size-8 text-muted-foreground">
							<IconPlus class="w-4" />
						</Button>
						<Button onclick={onZoomOut} variant="ghost" class="size-8 text-muted-foreground">
							<IconMinus class="w-4" />
						</Button>
					</ButtonGroup.Root>
				</div>
			</div>
			<div
				bind:this={listElement}
				class={{
					'bg-white': true,
					'relative w-156 rounded-xl border p-4 pr-0.75 shadow-sm': !compact,
					'absolute top-0 left-0 h-full w-full': compact,
					hidden: compact && !list
				}}
			>
				<ScrollArea class="h-full w-full rounded-md">
					<div
						class={{
							'grid gap-4': true,
							'grid-cols-1 p-4': compact,
							'grid-cols-2 pr-3.25': !compact
						}}
					>
						{#each searchItems.values() as item, i (item.propId)}
							<div
								bind:this={listElements[i]}
								data-id={item.propId.toString()}
								style:height={`${listPopupHeight}px`}
								style:width={`${listPopupWidth}px`}
							>
								<Details id={item.propId.toString()} data={searchItemDetails} />
							</div>
						{/each}
					</div>
				</ScrollArea>
			</div>
		</div>

		{#if compact}
			<footer class="z-1 h-full w-full shrink-0 border-t bg-white px-4">
				<div class="flex h-full w-full items-center gap-4">
					<Button
						onclick={() => (list = true)}
						variant="ghost"
						class={{
							'grow bg-stone-100 inset-shadow-sm transition-all duration-150': true,
							'bg-[#df2d43] text-white': list
						}}
					>
						<IconList /> Lista
					</Button>
					<Button
						onclick={() => (list = false)}
						variant="ghost"
						class={{
							'grow bg-stone-100 inset-shadow-sm transition-all duration-150': true,
							'bg-[#df2d43] text-white': !list
						}}
					>
						<IconMap /> Mapa
					</Button>
				</div>
			</footer>
		{/if}

		<Dialog.Root bind:open={dialogOpen}>
			<Dialog.Content
				class={{ 'flex flex-col p-2': true, 'max-w-100': !compact }}
				autofocus={false}
				trapFocus={false}
			>
				<div class="" style:height={`${listPopupHeight}px`}>
					<Details id={dialogId} data={searchItemDetails} />
				</div>
			</Dialog.Content>
		</Dialog.Root>
	</div>
{/if}
