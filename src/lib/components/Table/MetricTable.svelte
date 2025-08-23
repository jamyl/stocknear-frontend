<script>
  import { abbreviateNumber } from "$lib/utils";
  import { stockTicker } from "$lib/store";

  export let title = "";
  export let dateData = [];
  export let names = [];
  export let categoryValues = [];
  export let growthValues = [];
  export let href = false;

  let getHref = (name) =>
    `/stocks/${$stockTicker}/metrics/${name?.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`; // optional, for linking revenue names

  // Helper to format dates consistently.
  const formatDate = (d) => {
    const date = new Date(d);
    return isNaN(date)
      ? "Invalid Date"
      : date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };

  // Format a growth value for display.
  const formatGrowth = (growthValue) => {
    if (growthValue === null || growthValue === undefined) return "n/a";
    return (growthValue > 0 ? "+" : "") + growthValue.toFixed(2) + "%";
  };
</script>

<section class="my-5 pb-5">
  <h2 class="mt-5 text-xl sm:text-2xl font-bold mb-4">{title}</h2>

  <div
    class="no-scrollbar flex justify-start items-center w-screen sm:w-full mt-6 m-auto overflow-x-auto pr-5 sm:pr-0"
  >
    <table
      class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto"
    >
      <thead class="bg-default text-white">
        <tr>
          <th
            class="border-b border-r border-gray-800 font-semibold text-sm text-start"
          >
            Period Ending
          </th>
          {#each dateData as item}
            <th
              class="z-20 border-b border-r min-w-[120px] border-gray-800 font-semibold text-sm text-end"
            >
              {formatDate(item)}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="shadow">
        {#each names as name, index}
          <tr class="odd:bg-[#F6F7F8] dark:odd:bg-odd">
            <th
              class="whitespace-nowrap text-sm sm:text-[1rem] font-normal text-start border-b border-r border-gray-300 dark:border-gray-800"
            >
              {#if href}
                <a
                  href={getHref(name)}
                  class="sm:hover:text-blue-800 dark:sm:hover:text-blue-400 cursor-pointer underline underline-offset-4"
                >
                  {name} Revenue
                </a>
              {:else}
                {name} Revenue
              {/if}
            </th>
            {#each categoryValues[index] as value}
              <td
                class="whitespace-nowrap text-sm sm:text-[1rem] text-end border-b border-r border-gray-300 dark:border-gray-800"
              >
                {@html value !== null && value !== undefined && value !== 0
                  ? abbreviateNumber(value, false, true)
                  : "n/a"}
              </td>
            {/each}
          </tr>
          <tr>
            <td
              class="whitespace-nowrap text-sm sm:text-[1rem] font-normal text-start border-b border-r border-gray-300 dark:border-gray-800"
            >
              <span class="ml-2">{name} Revenue Growth</span>
            </td>
            {#each growthValues[index] as growthValue}
              <td
                class="text-sm sm:text-[1rem] text-end
                {growthValue > 0
                  ? 'text-green-800 dark:text-[#00FC50]'
                  : growthValue < 0
                    ? 'text-red-800 dark:text-[#FF2F1F]'
                    : ''} 
                border-b border-r border-gray-300 dark:border-gray-800"
              >
                {formatGrowth(growthValue)}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
