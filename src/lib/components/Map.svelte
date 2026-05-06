<script lang="ts">
	import { onMount, mount, tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	import {
		PIN_RADIUS,
		PIN_STROKE,
		POPUP_HEIGHT,
		POPUP_RADIUS,
		POPUP_WIDTH,
		TOOLTIP_HEIGHT,
		TOOLTIP_RADIUS,
		TOOLTIP_WIDTH
	} from '$lib/constants';
	import { getSearchLocation } from '$lib/search';
	import type { SearchItem, SearchItemDetails, SearchRequest } from '$lib/types';

	import Pin from '$lib/marker/Pin.svelte';
	import Tooltip from '$lib/marker/Tooltip.svelte';
	import Popup from '$lib/marker/Popup.svelte';

	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	import IconPlus from '@lucide/svelte/icons/plus';
	import IconMinus from '@lucide/svelte/icons/minus';
	import IconSettings from '@lucide/svelte/icons/settings';

	import { MapManager, type MapMarkerProperties } from '@arenarium/maps';
	import { MaplibreProvider } from '@arenarium/maps-integration-maplibre';
	import '@arenarium/maps/style.css';
	import { PUBLIC_ARENARIUM_MAPS_TOKEN } from '$env/static/public';

	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface Props {
		compact: boolean;
		search: SearchRequest;
		searchItems: SvelteMap<string, SearchItem>;
		searchItemDetails: SvelteMap<string, SearchItemDetails>;
		onSearchDetailsRequest: (id: string) => Promise<void>;
		onSearchDetailsOpen: (id: string) => void;
	}

	let {
		compact,
		search,
		searchItems: items,
		searchItemDetails: details,
		onSearchDetailsRequest,
		onSearchDetailsOpen
	}: Props = $props();

	let spacing = $derived(compact ? 0.8 : 1);

	let mapProvider: MaplibreProvider | undefined;
	let mapLibre: maplibregl.Map | undefined;
	let mapManager = $state<MapManager>();
	let mapMarkers: Map<string, MapMarkerProperties> = new Map();

	onMount(async () => {
		// Create a maplibre provider instance
		mapProvider = new MaplibreProvider(maplibregl.Map, maplibregl.Marker, {
			container: 'map',
			zoom: 13,
			zoomSnap: compact ? 0 : 0.2,
			center: getSearchLocation(search.cityId),
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

	$effect(() => {
		return () => {
			// Clean up the map manager when the component is destroyed
			mapManager?.clear();
		};
	});

	$effect(() => {
		if (mapLibre && search) {
			mapLibre.jumpTo({ center: getSearchLocation(search.cityId) });
		}
	});

	$effect(() => {
		if (mapManager) {
			updateMarkers(Array.from(items.values()));
		}
	});

	function onZoomIn() {
		mapLibre?.zoomIn();
	}

	function onZoomOut() {
		mapLibre?.zoomOut();
	}

	async function onInitializePin(id: string, element: HTMLElement): Promise<void> {
		const item = items.get(id);
		if (!item) throw new Error('Item not found');

		const width = (2 * PIN_RADIUS - PIN_STROKE) * spacing;
		const height = (2 * PIN_RADIUS - PIN_STROKE) * spacing;

		mount(Pin, {
			target: element,
			props: { width, height, type: item.ptId }
		});
	}

	async function onInitializeTooltip(id: string, element: HTMLElement): Promise<void> {
		const marker = mapMarkers.get(id);
		if (!marker) throw new Error('Marker not found');

		const dimensions = marker.tooltip?.dimensions;
		if (!dimensions) throw new Error('Tooltip style not found');

		const width = dimensions.width;
		const height = dimensions.height;
		const data = details;

		mount(Tooltip, {
			target: element,
			props: { id, spacing, width, height, data }
		});

		if (details.get(id) === undefined) await onSearchDetailsRequest(id);
	}

	async function onInitializePopup(id: string, element: HTMLElement): Promise<void> {
		const marker = mapMarkers.get(id);
		if (!marker) throw new Error('Marker not found');

		const dimensions = marker.popup?.dimensions;
		if (!dimensions) throw new Error('Popup style not found');

		const width = dimensions.width;
		const height = dimensions.height;
		const data = details;

		mount(Popup, {
			target: element,
			props: { id, spacing, width, height, data }
		});

		if (details.get(id) === undefined) await onSearchDetailsRequest(id);
	}

	function updateMarkers(searchItems: SearchItem[]) {
		if (!mapManager) return;

		// Clear existing markers
		mapMarkers.clear();
		// Clear map markers
		mapManager.clear();

		// Track added coordinates to avoid duplicates
		let coordinateSet = new Set<string>();

		// Create markers
		for (let i = 0; i < searchItems.length; i++) {
			const item = searchItems[i];

			// Check if the marker with the same coordinates is already added
			const coordinateKey = item.mapLat + ',' + item.mapLng;
			if (coordinateSet.has(coordinateKey)) continue;
			coordinateSet.add(coordinateKey);

			const marker: MapMarkerProperties = {
				id: item.propId.toString(),
				rank: searchItems.length - i,
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
						width: POPUP_WIDTH,
						height: POPUP_HEIGHT,
						padding: 8
					},
					style: {
						background: '#ffffff',
						radius: POPUP_RADIUS,
						filter: 'drop-shadow(rgba(0, 0, 0, 0.25) 0px 4px 4px)'
					}
				};
			} else {
				marker.tooltip.element.addEventListener('click', () => onSearchDetailsOpen(marker.id));
			}

			mapMarkers.set(item.propId.toString(), marker);
		}

		// Update map markers
		mapManager.updateMarkers(Array.from(mapMarkers.values()));
	}
</script>

<div id="map" class="absolute h-full w-full"></div>
<div class="absolute top-4 left-4">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline" size="icon" class="shadow-md">
					<IconSettings class="text-muted-foreground" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="w-60">
			<DropdownMenu.Label>Podaci</DropdownMenu.Label>
			<DropdownMenu.Group>
				<DropdownMenu.Item>Cena</DropdownMenu.Item>
				<DropdownMenu.Item>Cena, Povrsina, Struktura</DropdownMenu.Item>
				<DropdownMenu.Item>Cena, Povrsina, Struktura, Slika</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
<div class="absolute top-4 right-4">
	<ButtonGroup.Root orientation="vertical" class="rounded-lg bg-white shadow-md">
		<Button onpointerdown={onZoomIn} variant="ghost" class="size-8 text-muted-foreground">
			<IconPlus class="w-4" />
		</Button>
		<Button onpointerdown={onZoomOut} variant="ghost" class="size-8 text-muted-foreground">
			<IconMinus class="w-4" />
		</Button>
	</ButtonGroup.Root>
</div>
