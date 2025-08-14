<script lang="ts">
  import { abbreviateNumber, formatETFName } from "$lib/utils";

  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;
  let etfProviderList = data?.getAllETFProviders;

  let columns = [
    { key: "etfProvider", label: "Provider Name", align: "left" },
    { key: "totalAssets", label: "Total Assets", align: "right" },
    { key: "funds", label: "Funds", align: "right" },
    { key: "avgExpenseRatio", label: "Avg. Cost", align: "right" },
    { key: "avgHoldings", label: "Avg. Holdings", align: "right" },
  ];

  let sortOrders = {
    etfProvider: { order: "none", type: "string" },
    totalAssets: { order: "none", type: "number" },
    funds: { order: "none", type: "number" },
    avgExpenseRatio: { order: "none", type: "number" },
    avgHoldings: { order: "none", type: "number" },
  };

  const sortData = (key) => {
    // Reset all other keys to 'none' except the current key
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    // Cycle through 'none', 'asc', 'desc' for the clicked key
    const orderCycle = ["none", "asc", "desc"];

    let originalData = data?.getAllETFProviders;

    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      etfProviderList = [...originalData]; // Reset to original data (spread to avoid mutation)
      return;
    }

    // Define a generic comparison function
    const compareValues = (a, b) => {
      const { type } = sortOrders[key];
      let valueA, valueB;

      switch (type) {
        case "date":
          valueA = new Date(a[key]);
          valueB = new Date(b[key]);
          break;
        case "string":
          valueA = a[key].toUpperCase();
          valueB = b[key].toUpperCase();
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        case "number":
        default:
          valueA = parseFloat(a[key]);
          valueB = parseFloat(b[key]);
          break;
      }

      if (sortOrder === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    };

    // Sort using the generic comparison function
    etfProviderList = [...originalData].sort(compareValues);
  };
</script>

<SEO
  title="Top ETF Providers Directory - Leading Fund Companies by Assets Under Management"
  description="Comprehensive directory of leading ETF providers ranked by assets under management (AUM). Compare expense ratios, fund counts, and average holdings across major ETF companies including Vanguard, BlackRock, State Street, and other top fund managers."
  keywords="ETF providers, ETF companies, fund managers, BlackRock ETFs, Vanguard ETFs, State Street ETFs, ETF sponsors, fund companies by AUM, ETF manager comparison, ETF industry leaders"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ETF Providers Directory",
    description: "Complete directory of exchange-traded fund providers and sponsors",
    url: "https://stocknear.com/etf/etf-providers",
    mainEntity: {
      "@type": "ItemList",
      name: "ETF Fund Managers",
      description: "Leading ETF providers ranked by assets under management",
      numberOfItems: etfProviderList?.length || 0
    },
    about: {
      "@type": "FinancialService",
      name: "ETF Management Services",
      description: "Investment management companies providing exchange-traded funds"
    }
  }}
/>

<section class="w-full overflow-hidden m-auto">
  <Infobox
    text={"Every Exchange-Traded Fund (ETF) is managed by a specific company. Below is a list of companies offering actively traded ETFs on the U.S. stock market."}
  />

  <!-- Page wrapper -->
  <div class="flex justify-center w-full m-auto h-full overflow-hidden">
    <!-- Content area -->
    <div class="w-full">
      <div class="w-full overflow-x-auto">
        <table
          class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
        >
          <thead>
            <TableHeader {columns} {sortOrders} {sortData} />
          </thead>
          <tbody>
            {#each etfProviderList as item}
              <!-- row -->
              <tr
                class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
              >
                <td class="text-sm sm:text-[1rem] whitespace-nowrap">
                  <a
                    href={"/etf/etf-providers/" + item?.etfProvider}
                    class="text-blue-800 sm:hover:text-muted dark:text-blue-400 dark:sm:hover:text-white"
                  >
                    {formatETFName(item?.etfProvider)}
                  </a>
                </td>

                <td class=" text-sm sm:text-[1rem] whitespace-nowrap text-end">
                  {abbreviateNumber(item?.totalAssets)}
                </td>

                <td class=" text-sm sm:text-[1rem] whitespace-nowrap text-end">
                  {item?.funds}
                </td>

                <td class=" text-sm sm:text-[1rem] whitespace-nowrap text-end">
                  {item?.avgExpenseRatio}%
                </td>

                <td class=" text-sm sm:text-[1rem] whitespace-nowrap text-end">
                  {item?.avgHoldings}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>
