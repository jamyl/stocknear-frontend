<script lang="ts">
  import Infobox from "$lib/components/Infobox.svelte";

  export let wiim = [];
</script>

<section class="mx-auto lg:col-span-2 w-full">
  <label class="inline-flex items-center text-left w-full"
    ><h2 class="mb-2 text-xl font-bold leading-tight bp:text-2xl">
      Market News
    </h2>
  </label>
  {#if wiim?.length > 0}
    <table
      class="border-t border-gray-300 dark:border-gray-800 text-sm sm:text-[1rem]"
    >
      <tbody>
        {#each wiim as item}
          <tr class="border-b border-gray-300 dark:border-gray-800"
            ><td
              class="hidden sm:inline-block pr-1 pt-2 align-top text-sm whitespace-nowrap font-bold"
              >{item?.timeAgo}</td
            >
            <td class="py-2 pl-2">
              <span class="sm:hidden font-semibold">{item?.timeAgo} ago -</span>
              {item?.text}

              <a
                href={`/${item?.assetType}/${item?.ticker}`}
                class="inline-block rounded badge border border-gray-300 dark:border-gray-800 shadow-xs duration-0 bg-blue-100 dark:bg-primary font-semibold dark:font-normal rounded-sm ml-1 px-2 m-auto text-blue-800 dark:text-blue-400 dark:sm:hover:text-white sm:hover:text-muted"
                >{item?.ticker}</a
              >
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <Infobox text="There are no major stock market news available yet." />
  {/if}
</section>
