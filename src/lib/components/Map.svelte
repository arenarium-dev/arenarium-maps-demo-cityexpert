<script lang="ts">
	import { onMount, mount, tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	import {
		PIN_RADIUS,
		PIN_STROKE,
		POPUP_HEIGHT,
		POPUP_RADIUS,
		POPUP_WIDTH,
		POPUP_PADDING,
		TOOLTIP_SMALL_HEIGHT,
		TOOLTIP_SMALL_RADIUS,
		TOOLTIP_SMALL_WIDTH,
		TOOLTIP_SMALL_PADDING,
		TOOLTIP_MEDIUM_HEIGHT,
		TOOLTIP_MEDIUM_RADIUS,
		TOOLTIP_MEDIUM_WIDTH,
		TOOLTIP_MEDIUM_PADDING,
		TOOLTIP_LARGE_HEIGHT,
		TOOLTIP_LARGE_RADIUS,
		TOOLTIP_LARGE_WIDTH,
		TOOLTIP_LARGE_PADDING,
		TOOLTIP_IMAGE_RADIUS,
		TOOLTIP_IMAGE_WIDTH,
		TOOLTIP_IMAGE_HEIGHT,
		TOOLTIP_IMAGE_PADDING
	} from '$lib/constants';
	import { getSearchLocation } from '$lib/search';
	import type { SearchItem, SearchItemDetails, SearchRequest } from '$lib/types';

	import Pin from '$lib/marker/Pin.svelte';
	import Popup from '$lib/marker/Popup.svelte';
	import TooltipSmall from '$lib/marker/tooltip/Small.svelte';
	import TooltipMedium from '$lib/marker/tooltip/Medium.svelte';
	import TooltipLarge from '$lib/marker/tooltip/Large.svelte';
	import TooltipImage from '$lib/marker/tooltip/Image.svelte';

	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	import IconPlus from '@lucide/svelte/icons/plus';
	import IconMinus from '@lucide/svelte/icons/minus';
	import IconPin from '@lucide/svelte/icons/map-pin';

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

	const Modes = {
		Small: 'small',
		Medium: 'medium',
		Large: 'large',
		Image: 'image'
	};

	let mode = $state<string>(Modes.Medium);
	let spacing = $derived(compact ? 0.8 : 1);

	let pinDimensions = $derived({
		radius: PIN_RADIUS * spacing,
		stroke: PIN_STROKE * spacing
	});
	let tooltipDimensions = $derived.by(() => {
		switch (mode) {
			case Modes.Small:
				return {
					width: TOOLTIP_SMALL_WIDTH * spacing,
					height: TOOLTIP_SMALL_HEIGHT * spacing,
					radius: TOOLTIP_SMALL_RADIUS * spacing,
					padding: TOOLTIP_SMALL_PADDING * spacing
				};
			case Modes.Medium:
				return {
					width: TOOLTIP_MEDIUM_WIDTH * spacing,
					height: TOOLTIP_MEDIUM_HEIGHT * spacing,
					radius: TOOLTIP_MEDIUM_RADIUS * spacing,
					padding: TOOLTIP_MEDIUM_PADDING * spacing
				};
			case Modes.Large:
				return {
					width: TOOLTIP_LARGE_WIDTH * spacing,
					height: TOOLTIP_LARGE_HEIGHT * spacing,
					radius: TOOLTIP_LARGE_RADIUS * spacing,
					padding: TOOLTIP_LARGE_PADDING * spacing
				};
			case Modes.Image:
				return {
					width: TOOLTIP_IMAGE_WIDTH * spacing,
					height: TOOLTIP_IMAGE_HEIGHT * spacing,
					radius: TOOLTIP_IMAGE_RADIUS * spacing,
					padding: TOOLTIP_IMAGE_PADDING * spacing
				};
			default:
				throw new Error(`Invalid mode: ${mode}`);
		}
	});
	let popupDimensions = $derived({
		width: POPUP_WIDTH,
		height: POPUP_HEIGHT,
		radius: POPUP_RADIUS,
		padding: POPUP_PADDING
	});

	let mapProvider: MaplibreProvider | undefined;
	let mapLibre: maplibregl.Map | undefined;
	let mapManager = $state<MapManager>();
	let mapMarkers: Map<string, MapMarkerProperties> = new Map();

	onMount(async () => {
		// Get the mode from localStorage
		mode = localStorage.getItem('mode') ?? Modes.Medium;

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
		// Jump to the search location when the map is available and search changes
		if (mapLibre && search) {
			mapLibre.jumpTo({ center: getSearchLocation(search.cityId) });
		}
	});

	$effect(() => {
		// Update markers when the map manager is available
		if (mapManager) {
			// And items change
			updateMarkers(Array.from(items.values()));
		}
	});

	$effect(() => {
		// Save the mode to localStorage
		localStorage.setItem('mode', mode);
	});

	function getModeLabel(mode: string): string {
		switch (mode) {
			case 'small':
				return 'Mali';
			case 'medium':
				return 'Srednji';
			case 'large':
				return 'Veliki';
			case 'image':
				return 'Slika';
			default:
				throw new Error(`Unknown mode: ${mode}`);
		}
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
					dimensions: {
						radius: pinDimensions.radius,
						stroke: pinDimensions.stroke
					},
					style: { stroke: '#ffffff', background: '#df2d4344' }
				},
				tooltip: {
					initialize: onInitializeTooltip,
					element: document.createElement('div'),
					dimensions: {
						width: tooltipDimensions.width,
						height: tooltipDimensions.height,
						padding: tooltipDimensions.padding
					},
					style: {
						background: '#ffffff',
						radius: tooltipDimensions.radius,
						filter: 'drop-shadow(rgba(0, 0, 0, 0.25) 0px 2px 2px)'
					}
				}
			};

			if (compact === false) {
				marker.popup = {
					initialize: onInitializePopup,
					element: document.createElement('div'),
					dimensions: {
						width: popupDimensions.width,
						height: popupDimensions.height,
						padding: popupDimensions.padding
					},
					style: {
						background: '#ffffff',
						radius: popupDimensions.radius,
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

	async function onInitializePin(id: string, element: HTMLElement): Promise<void> {
		const item = items.get(id);
		if (!item) throw new Error('Item not found');

		const width = 2 * pinDimensions.radius - pinDimensions.stroke;
		const height = 2 * pinDimensions.radius - pinDimensions.stroke;

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

		switch (mode) {
			case 'small':
				mount(TooltipSmall, {
					target: element,
					props: { id, spacing, width, height, data }
				});
				break;
			case 'medium':
				mount(TooltipMedium, {
					target: element,
					props: { id, spacing, width, height, data }
				});
				break;
			case 'large':
				mount(TooltipLarge, {
					target: element,
					props: { id, spacing, width, height, data }
				});
				break;
			case 'image':
				mount(TooltipImage, {
					target: element,
					props: { id, spacing, width, height, data }
				});
				break;
			default:
				throw new Error('Invalid mode');
		}

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

	function onZoomIn() {
		mapLibre?.zoomIn();
	}

	function onZoomOut() {
		mapLibre?.zoomOut();
	}
</script>

<div id="map" class="absolute h-full w-full"></div>
<div class="absolute top-4 right-4 rounded-lg">
	<Select.Root type="single" bind:value={mode}>
		<Select.Trigger
			class="size-8 gap-4 overflow-hidden border-none bg-white px-2 text-muted-foreground shadow-sm"
		>
			<IconPin class="w-4 shrink-0" />
		</Select.Trigger>
		<Select.Content align="end" class="mt-2">
			<Select.Group class="font-medium ">
				<Select.Label>Marker</Select.Label>
				{#each Object.values(Modes) as mode}
					<Select.Item value={mode} label={mode}>
						{getModeLabel(mode)}
					</Select.Item>
				{/each}
			</Select.Group>
		</Select.Content>
	</Select.Root>
</div>
<div class="absolute right-4 bottom-12">
	<ButtonGroup.Root orientation="vertical" class="rounded-lg bg-white shadow-sm">
		<Button onpointerdown={onZoomIn} variant="ghost" class="size-8 text-muted-foreground">
			<IconPlus class="w-4" />
		</Button>
		<Button onpointerdown={onZoomOut} variant="ghost" class="size-8 text-muted-foreground">
			<IconMinus class="w-4" />
		</Button>
	</ButtonGroup.Root>
</div>
