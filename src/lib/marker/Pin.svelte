<script lang="ts">
	let props: { width: number; height: number; type: number } = $props();

	const objectPositionY = $derived.by(() => {
		switch (props.type.toString()) {
			case '1':
				return 0.5;
			default:
				return 0;
		}
	});
</script>

<div
	class="flex items-center justify-center overflow-hidden rounded-full"
	style="width: {props.width}px; height: {props.height}px;"
>
	<img
		class="overflow-hidden rounded-full object-cover"
		style="width: {props.width}px; height: {props.height}px; object-position: 0px {objectPositionY}px;"
		src="https://cityexpert.rs/icons/map/pin_{props.type}.png"
		alt={props.type.toString()}
	/>
</div>
