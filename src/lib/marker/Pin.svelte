<script lang="ts">
	import Type from '$lib/components/Type.svelte';

	let props: { width: number; height: number; type: number } = $props();
</script>

<div
	class="flex items-center justify-center overflow-hidden rounded-full"
	style="width: {props.width}px; height: {props.height}px;"
>
	<Type type={props.type} />
</div>
