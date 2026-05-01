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
	import IconClose from '@lucide/svelte/icons/x';

	import { MapManager, type MapMarkerProperties } from '@arenarium/maps';
	import { MaplibreProvider } from '@arenarium/maps-integration-maplibre';
	import '@arenarium/maps/style.css';

	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import type { SearchItem, SearchItemDetails, SearchRequest, SearchResult } from '$lib/types';

	import { PUBLIC_ARENARIUM_MAPS_TOKEN } from '$env/static/public';

	const PIN_RADIUS = 10;
	const PIN_STROKE = 2;

	const TOOLTIP_RADIUS = 8;
	const TOOLTIP_WIDTH = 92;
	const TOOLTIP_HEIGHT = 48;

	const POPUP_RADIUS = 24;
	const POPUP_WIDTH = 320;
	const POPUP_HEIGHT = 320;

	let width = $derived(outerWidth.current ?? 0);
	let compact = $derived(width && width <= 470 + 32);
	let spacing = $derived(compact ? 0.8 : 1);

	let mapMounted = false;
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
	let listElement = $state<HTMLElement>();
	let listElements = $state<HTMLElement[]>([]);
	let listObserver: IntersectionObserver | undefined;

	let listItemGapPadding = 32;
	let listItemRatio = 3 / 3;
	let listItemUnit = 16;
	let listItemHeightUnits = $derived.by(() => {
		if (listElement == undefined) return 0;
		if (compact) return width / listItemUnit - 2;

		const listHeight = listElement.clientHeight;
		const listItemRows = Math.round(listHeight / POPUP_WIDTH) > 3 ? 3 : 2;
		const listItemsHeight = listHeight - listItemGapPadding * (2 + (listItemRows - 1));
		const listItemHeight = listItemsHeight / listItemRows;
		return listItemHeight / listItemUnit;
	});
	let listItemWidthUnits = $derived(listItemHeightUnits * listItemRatio);

	let dialogOpen = $state(false);
	let dialogId = $state<string>('');

	$effect(() => {
		if (listItemWidthUnits > 0 && listItemHeightUnits > 0 && mapMounted == false) {
			// Flag mounted to true
			mapMounted = true;

			// Wait for the next tick before creating the map to ensure the proper dimensions
			tick().then(async () => {
				// Create a maplibre provider instance
				mapProvider = new MaplibreProvider(maplibregl.Map, maplibregl.Marker, {
					container: 'map',
					zoom: 13,
					zoomSnap: compact ? 0 : undefined,
					center: getSearchLocation(searchPage.cityId),
					style: '/style.json'
					// Other maplibre options...
				});
				// Access the maplibre instance for direct map interactions
				mapLibre = mapProvider.getMap();
				console.log(mapLibre.getZoomSnap());
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
		}
	});

	$effect(() => {
		return () => {
			// Clean up the list observer when the component is destroyed
			listObserver?.disconnect();
			// Clean up the map manager when the component is destroyed
			mapManager?.clear();
		};
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
		mapLibre?.zoomIn();
	}

	function onZoomOut() {
		mapLibre?.zoomOut();
	}

	async function onInitializePin(id: string, element: HTMLElement): Promise<void> {
		const item = searchItems.get(id);
		if (!item) throw new Error('Item not found');

		const width = (2 * PIN_RADIUS - PIN_STROKE) * spacing;
		const height = (2 * PIN_RADIUS - PIN_STROKE) * spacing;

		mount(Pin, {
			target: element,
			props: { width, height, type: item.ptId }
		});
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
					dimensions: {
						width: Math.min(listItemWidthUnits * listItemUnit, POPUP_WIDTH),
						height: Math.min(listItemHeightUnits * listItemUnit, POPUP_HEIGHT),
						padding: 8
					},
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
			'fixed top-0 left-0 grid h-full w-full bg-white': true,
			'grid-rows-[60px_1fr_60px]': compact,
			'grid-rows-[96px_1fr]': !compact
		}}
	>
		<header
			class={{
				'z-1 flex h-full w-full shrink-0 items-center gap-4 overflow-auto bg-white shadow-sm': true,
				'px-4': compact,
				'px-8': !compact
			}}
		>
			<a
				href="https://cityexpert.rs"
				class="flex h-8 shrink-0 items-center justify-center rounded-lg bg-white"
			>
				{#if compact}
					<img src="/favicon.ico" alt="logo" class="m-2" />
				{:else}
					<img src={SvgLogo} alt="logo" class="mx-3 mt-1 w-36" />
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

		<div class={{ 'relative flex min-h-0': true, 'gap-8 px-8': !compact }}>
			<div
				bind:this={listElement}
				class={{
					'absolute top-0 left-0 h-full w-full': compact,
					relative: !compact,
					hidden: compact && !list
				}}
			>
				<ScrollArea class="h-full w-full rounded-md" scrollbarYClasses="my-8 -mr-4.75 w-2!">
					<div
						class={{
							'grid gap-8': true,
							'grid-cols-1 p-4': compact,
							'grid-cols-2 py-8': !compact
						}}
						style:width={`${listItemWidthUnits * (compact ? 1 : 2) + (compact ? 0 : 2)}rem`}
					>
						{#each searchItems.values() as item, i (item.propId)}
							<div
								bind:this={listElements[i]}
								data-id={item.propId.toString()}
								style:height={`${listItemHeightUnits}rem`}
								style:width={`${listItemWidthUnits}rem`}
							>
								<Details id={item.propId.toString()} data={searchItemDetails} />
							</div>
						{/each}
					</div>
				</ScrollArea>
			</div>
			<div
				class={{
					'relative grow bg-white ': true,
					'py-8': !compact,
					hidden: list
				}}
			>
				<div id="map" class={{ 'absolute h-full w-full': true, 'rounded-2xl': !compact }}></div>
				<div
					class={{
						'pointer-events-none absolute inset-shadow-sm': true,
						'top-8 right-0 bottom-8 left-0 rounded-2xl': !compact
					}}
				></div>
				<div class={{ 'absolute top-4 right-4': compact, 'absolute top-12 right-4': !compact }}>
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
				class={{ 'flex flex-col rounded-3xl! p-2': true, 'max-w-100': !compact }}
				autofocus={false}
				trapFocus={false}
				showCloseButton={false}
			>
				<div style:height={`${listItemHeightUnits}rem`}>
					<Details id={dialogId} data={searchItemDetails} />
				</div>
				<Dialog.Close class="absolute top-4 right-4">
					<Button variant="ghost" class="size-8 text-white">
						<IconClose class="w-4" strokeWidth={3} />
					</Button>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Root>
	</div>
{/if}
