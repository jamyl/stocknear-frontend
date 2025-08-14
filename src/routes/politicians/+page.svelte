<script lang="ts">
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import ArrowLogo from "lucide-svelte/icons/move-up-right";

  import SEO from "$lib/components/SEO.svelte";

  import { onMount } from "svelte";
  import { page } from "$app/stores";

  import { compareTwoStrings } from "string-similarity";

  export let data;

  let syncWorker: Worker | undefined;

  let pagePathName = $page?.url?.pathname;
  let timeoutId;

  let rawData = data?.getAllPolitician;

  let displayList = [];
  let isLoaded = false;
  let animationClass = "";
  let animationId = "";
  let favoriteList = [];
  let inputValue = "";
  let filterList = [];
  let checkedItems: Set<any> = new Set();

  // Handle messages from our filtering web worker.
  const handleMessage = (event) => {
    rawData = event.data?.output || [];
    rawData?.sort((a, b) => {
      // Check if each id is in the favoriteList
      const aIsFavorite = favoriteList?.includes(a?.id);
      const bIsFavorite = favoriteList?.includes(b?.id);

      // If both are favorites or both are not, keep their order
      if (aIsFavorite === bIsFavorite) return 0;

      // If a is favorite and b is not, a comes first; otherwise, b comes first
      return aIsFavorite ? -1 : 1;
    });

    displayList = rawData?.slice(0, 100) ?? [];
  };

  // Tell the web worker to filter our data
  const loadWorker = async () => {
    syncWorker?.postMessage({
      rawData: data?.getAllPolitician,
      filterList: filterList,
    });
  };

  async function handleChangeValue(value) {
    if (checkedItems.has(value)) {
      checkedItems.delete(value);
    } else {
      checkedItems.add(value);
    }
    const filterSet = new Set(filterList);
    filterSet.has(value) ? filterSet.delete(value) : filterSet.add(value);
    filterList = Array.from(filterSet);

    if (filterList.length > 0) {
      await loadWorker();
    } else {
      rawData = [...data?.getAllPolitician];
      rawData?.sort((a, b) => {
        // Check if each id is in the favoriteList
        const aIsFavorite = favoriteList?.includes(a?.id);
        const bIsFavorite = favoriteList?.includes(b?.id);

        // If both are favorites or both are not, keep their order
        if (aIsFavorite === bIsFavorite) return 0;

        // If a is favorite and b is not, a comes first; otherwise, b comes first
        return aIsFavorite ? -1 : 1;
      });

      displayList = rawData?.slice(0, 100) ?? [];
    }
  }

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && displayList?.length !== rawData?.length) {
      const nextIndex = displayList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 20);
      displayList = [...displayList, ...filteredNewResults];
    }
  }

  onMount(async () => {
    try {
      const savedList = localStorage?.getItem(pagePathName);

      if (savedList) {
        favoriteList = JSON?.parse(savedList);
      }
    } catch (e) {
      console.log(e);
    }

    if (!syncWorker) {
      const SyncWorker = await import("./workers/filterWorker?worker");
      syncWorker = new SyncWorker.default();
      syncWorker.onmessage = handleMessage;
    }

    rawData?.sort((a, b) => {
      // Check if each id is in the favoriteList
      const aIsFavorite = favoriteList?.includes(a?.id);
      const bIsFavorite = favoriteList?.includes(b?.id);

      // If both are favorites or both are not, keep their order
      if (aIsFavorite === bIsFavorite) return 0;

      // If a is favorite and b is not, a comes first; otherwise, b comes first
      return aIsFavorite ? -1 : 1;
    });

    displayList = rawData?.slice(0, 100) ?? [];
    isLoaded = true;

    window.addEventListener("scroll", handleScroll);
    //window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Cleanup the event listeners when the component is unmounted
      window.removeEventListener("scroll", handleScroll);
      //window.removeEventListener('keydown', handleKeyDown);
    };
  });
  let newData = [];

  function search() {
    clearTimeout(timeoutId); // Clear any existing timeout
    newData = [];

    timeoutId = setTimeout(async () => {
      if (inputValue?.length > 0) {
        newData = rawData?.filter((item) => {
          const representative = item?.representative?.toLowerCase();
          // Check if representative includes inputValue
          if (representative?.includes(inputValue)) return true;

          // Implement fuzzy search by checking similarity
          // You can adjust the threshold as needed
          const similarityThreshold = 0.5;
          const similarity = compareTwoStrings(representative, inputValue);
          return similarity > similarityThreshold;
        });

        if (newData?.length > 0) {
          rawData = newData;
          displayList = [...newData];
        } else {
          if (filterList?.length === 0) {
            rawData = [...data?.getAllPolitician];
            displayList = rawData?.slice(0, 100);
          } else {
            await loadWorker();
          }
        }
      } else {
        // Reset to original data if filter is empty
        if (filterList?.length === 0) {
          rawData = [...data?.getAllPolitician];
          displayList = rawData?.slice(0, 100);
        } else {
          await loadWorker();
        }
      }
    }, 50);
  }

  function saveList() {
    try {
      // Save the version along with the rules
      localStorage?.setItem(pagePathName, JSON?.stringify(favoriteList));
    } catch (e) {
      console.log("Failed saving indicator rules: ", e);
    }
  }

  async function addToFavorite(event, itemId) {
    event?.preventDefault();
    if (favoriteList.includes(itemId)) {
      // Remove ticker from the watchlist.
      favoriteList = favoriteList?.filter((item) => item !== itemId);
    } else {
      // Add ticker to the watchlist.
      animationId = itemId;
      animationClass = "heartbeat";
      const removeAnimation = () => {
        animationId = "";
        animationClass = "";
      };
      favoriteList = [...favoriteList, itemId];
      const heartbeatElement = document.getElementById(itemId);
      if (heartbeatElement) {
        // Only add listener if it's not already present
        if (!heartbeatElement.classList.contains("animation-added")) {
          heartbeatElement.addEventListener("animationend", removeAnimation);
          heartbeatElement.classList.add("animation-added"); // Prevent re-adding listener
        }
      }
    }

    saveList();
  }

  let columns = [
    { key: "representative", label: "Person", align: "left" },
    { key: "party", label: "Party", align: "right" },
    { key: "district", label: "District", align: "right" },
    { key: "totalTrades", label: "Total Trades", align: "right" },
    { key: "lastTrade", label: "Last Trade", align: "right" },
  ];

  let sortOrders = {
    representative: { order: "none", type: "string" },
    party: { order: "none", type: "string" },
    district: { order: "none", type: "string" },
    totalTrades: { order: "none", type: "number" },
    lastTrade: { order: "none", type: "date" },
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

    let originalData = rawData;

    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      displayList = [...originalData]?.slice(0, 100); // Reset to original data (spread to avoid mutation)
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
    displayList = [...originalData].sort(compareValues)?.slice(0, 100);
  };
</script>

<SEO
  title="Congress Trading Tracker - Real-Time Politicians Stock Trades "
  description="Track real-time stock trades by US Congress members, senators, and politicians. Monitor Nancy Pelosi trades, senate stock purchases, and congressional insider trading. Free politician trading tracker with detailed transaction history."
  keywords="congress trading, nancy pelosi trades, politician stock trades, senate trades, congressional trading, insider trading congress, political stock tracker, us politicians trading, pelosi portfolio, congress stock trades"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Congress Trading Tracker",
    description:
      "Real-time tracking of stock trades by US politicians and congress members",
    url: "https://stocknear.com/politicians",
    applicationCategory: "FinanceApplication",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://stocknear.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Politicians Trading",
          item: "https://stocknear.com/politicians",
        },
      ],
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 px-3"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li class="text-muted dark:text-gray-300">Politicians</li>
    </ul>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:w-3/4 lg:pr-5">
          <h1 class="text-2xl sm:text-3xl font-bold">All US Politicians</h1>
          <div
            class="w-full flex flex-col sm:flex-row items-center justify-start sm:justify-between w-full mt-5 text-muted sm:pt-2 sm:pb-2 dark:text-white sm:border-t sm:border-b sm:border-gray-300 sm:dark:border-gray-800"
          >
            <div
              class="flex flex-row items-center justify-between sm:justify-start w-full sm:w-fit whitespace-nowrap -mb-1 sm:mb-0"
            >
              <h2
                class="text-start w-full mb-2 sm:mb-0 text-xl sm:text-2xl font-semibold"
              >
                {rawData?.length?.toLocaleString("en-US")} Congress Members
              </h2>
            </div>

            <div
              class="flex items-center ml-auto border-t border-b border-gray-300 dark:border-gray-800 sm:border-none pt-2 pb-2 sm:pt-0 sm:pb-0 w-full"
            >
              <input
                type="text"
                bind:value={inputValue}
                on:input={search}
                placeholder="Find..."
                class="ml-auto py-[7px] text-[0.85rem] sm:text-sm border bg-white dark:bg-default shadow-xs focus:outline-hidden border border-gray-300 dark:border-gray-600 rounded placeholder:text-gray-800 dark:placeholder:text-gray-300 px-3 focus:outline-none focus:ring-0 dark:focus:border-gray-800 grow w-full sm:min-w-56 sm:max-w-14"
              />

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild let:builder>
                  <Button
                    builders={[builder]}
                    class="ml-2 transition-all min-w-fit sm:min-w-[110px]  bg-default text-white shadow-xs dark:border-gray-600 border sm:hover:bg-black dark:sm:hover:bg-primary ease-out flex flex-row justify-between items-center px-3 py-2 rounded truncate"
                  >
                    <span class="truncate">Filter by Party</span>
                    <svg
                      class="-mr-1 ml-1 h-5 w-5 xs:ml-2 inline-block"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      style="max-width:40px"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  side="bottom"
                  align="end"
                  sideOffset={10}
                  alignOffset={0}
                  class="w-56 h-fit max-h-72 overflow-y-auto scroller"
                >
                  <DropdownMenu.Group>
                    {#each ["Democratic", "Republican"] as item}
                      <DropdownMenu.Item
                        class="sm:hover:bg-gray-300 dark:sm:hover:bg-primary"
                      >
                        <div class="flex items-center">
                          <label
                            class="cursor-pointer"
                            on:click={() => handleChangeValue(item)}
                            for={item}
                          >
                            <input
                              type="checkbox"
                              checked={checkedItems.has(item)}
                            />
                            <span class="ml-2">{item}</span>
                          </label>
                        </div>
                      </DropdownMenu.Item>
                    {/each}
                  </DropdownMenu.Group>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          </div>

          <div class="w-full m-auto mt-4 overflow-x-auto">
            <table
              class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto"
            >
              <thead>
                <TableHeader {columns} {sortOrders} {sortData} />
              </thead>
              <tbody>
                {#each displayList as item}
                  <tr
                    class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                  >
                    <td
                      class="text-start text-sm sm:text-[1rem] whitespace-nowrap flex flex-row items-center justify-between w-full"
                    >
                      <a
                        href={`/politicians/${item?.id}`}
                        class="text-blue-800 sm:hover:text-muted dark:sm:hover:text-white dark:text-blue-400"
                        >{item?.representative?.replace("_", " ")}</a
                      >

                      <div
                        id={item?.id}
                        on:click|stopPropagation={(event) =>
                          addToFavorite(event, item?.id)}
                        class=" {favoriteList?.includes(item?.id)
                          ? 'text-yellow-500 dark:text-[#FFA500]'
                          : 'text-gray-400 dark:text-gray-300'}"
                      >
                        <svg
                          class="{item?.id === animationId
                            ? animationClass
                            : ''} w-5 h-5 inline-block cursor-pointer shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          ><path
                            fill="currentColor"
                            d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327l4.898.696c.441.062.612.636.282.95l-3.522 3.356l.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"
                          /></svg
                        >
                      </div>
                    </td>
                    <td
                      class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                    >
                      {item?.party}
                    </td>

                    <td
                      class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                    >
                      {item?.district?.length > 0 ? item?.district : "n/a"}
                    </td>

                    <td
                      class="text-end whitespace-nowrap text-sm sm:text-[1rem]"
                    >
                      {item?.totalTrades?.toLocaleString("en-US")}
                    </td>

                    <td
                      class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                    >
                      {new Date(item?.lastTrade)?.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        daySuffix: "2-digit",
                      })}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </main>

        <aside class="hidden lg:block relative fixed w-1/4 ml-4">
          {#if !["Pro", "Plus"]?.includes(data?.user?.tier)}
            <div
              class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
            >
              <a
                href={"/pricing"}
                class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
              >
                <div class="w-full flex justify-between items-center p-3 mt-3">
                  <h2 class="text-start text-xl font-bold ml-3">
                    Pro Subscription
                  </h2>
                  <ArrowLogo
                    class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:"
                  />
                </div>
                <span class="p-3 ml-3 mr-3">
                  Upgrade now for unlimited access to all data, tools and no
                  ads.
                </span>
              </a>
            </div>
          {/if}

          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href={"/politicians/flow-data"}
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">
                  Latest Congress Trading
                </h2>
                <ArrowLogo class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:" />
              </div>
              <span class="p-3 ml-3 mr-3">
                Get detailed reports on latest Congress trading transactions.
              </span>
            </a>
          </div>
          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href={"/stock-screener"}
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">
                  Stock Screener
                </h2>
                <ArrowLogo class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:" />
              </div>
              <span class="p-3 ml-3 mr-3">
                Build your Stock Screener to find profitable stocks.
              </span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>

<style>
  .heartbeat {
    animation: heartbeat-animation 0.3s;
    animation-timing-function: ease-in-out;
  }

  @keyframes heartbeat-animation {
    0% {
      transform: rotate(0deg) scale(0.95);
    }
    25% {
      transform: rotate(10deg) scale(1.05);
    }
    50% {
      transform: rotate(0deg) scale(1.2);
    }
    75% {
      transform: rotate(-10deg) scale(1.05);
    }
    100% {
      transform: rotate(0deg) scale(0.95);
    }
  }
</style>
