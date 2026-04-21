<script lang="ts">
	import type { SvelteMap } from 'svelte/reactivity';

	import Item from '$lib/components/details/Item.svelte';

	import type { MapSearchItemDetails } from '$lib/types';

	let props: {
		id: string;
		width: number;
		height: number;
		data: SvelteMap<string, MapSearchItemDetails>;
	} = $props();
</script>

<div class="p-1.5" style:width={props.width + 'px'} style:height={props.height + 'px'}>
	<Item id={props.id} data={props.data} />
</div>
