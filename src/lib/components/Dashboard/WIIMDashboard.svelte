<script lang="ts">
  import * as Card from "$lib/components/shadcn/card/index.ts";
  import Infobox from "$lib/components/Infobox.svelte";

  export let wiim;
</script>

<Card.Root
  class=" overflow-x-auto overflow-hidden overflow-y-auto no-scrollbar sm:max-h-[470px]"
>
  <Card.Header class="flex flex-row items-center">
    <div class="flex flex-col items-start w-full">
      <div class="flex flex-row w-full items-center">
        <Card.Title class="text-xl sm:text-2xl  font-semibold"
          >Stock & Market News</Card.Title
        >
      </div>
    </div>
  </Card.Header>
  <Card.Content>
    {#if wiim?.length !== 0}
      <ul style="padding-left: 5px;">
        {#each wiim as item}
          <li
            class="text-sm sm:text-[1rem]"
            style="margin-left: 8px; margin-bottom: 15px; list-style-type: disc;"
          >
            {item?.text}

            <a
              href={`/${item?.assetType}/${item?.ticker}`}
              class="inline-block badge duration-0 bg-blue-50 dark:bg-primary font-semibold dark:font-normal rounded-sm ml-1 px-2 m-auto text-blue-700 dark:text-blue-400 dark:sm:hover:text-white sm:hover:text-muted"
              >{item?.ticker}</a
            >
          </li>
        {/each}
      </ul>
    {:else}
      <Infobox text="There are no major stock market news available yet." />
    {/if}
  </Card.Content>
</Card.Root>

