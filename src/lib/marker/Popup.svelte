<script lang="ts">
	import type { SvelteMap } from 'svelte/reactivity';

	import Details from '$lib/components/Details.svelte';

	import type { SearchItemDetails } from '$lib/types';

	let props: {
		id: string;
		width: number;
		height: number;
		data: SvelteMap<string, SearchItemDetails>;
	} = $props();
</script>

<div class="p-2" style:width={props.width + 'px'} style:height={props.height + 'px'}>
	<Details id={props.id} data={props.data} />
</div>
