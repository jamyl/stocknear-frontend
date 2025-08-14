<script lang="ts">
  import {
    format,
    startOfWeek,
    addDays,
    addWeeks,
    subWeeks,
    differenceInWeeks,
  } from "date-fns";
  import { screenWidth } from "$lib/store";
  import { abbreviateNumber } from "$lib/utils";
  import Infobox from "$lib/components/Infobox.svelte";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import SEO from "$lib/components/SEO.svelte";

  import HoverStockChart from "$lib/components/HoverStockChart.svelte";

  export let data;
  let currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  let dividendCalendar = data?.getDividendCalendar;
  const maxWeeksChange = 4; // Maximum allowed week change
  let previousMax = false;
  let nextMax = false;
  const today = new Date();

  let formattedMonday = startOfWeek(currentWeek, { weekStartsOn: 1 });
  let formattedTuesday = format(addDays(formattedMonday, 1), "EEE, MMM d");
  let formattedWednesday = format(addDays(formattedMonday, 2), "EEE, MMM d");
  let formattedThursday = format(addDays(formattedMonday, 3), "EEE, MMM d");
  let formattedFriday = format(addDays(formattedMonday, 4), "EEE, MMM d");
  formattedMonday = format(formattedMonday, "EEE, MMM d");

  let formattedWeekday = [
    formattedMonday,
    formattedTuesday,
    formattedWednesday,
    formattedThursday,
    formattedFriday,
  ];
  let weekday = [];
  let rawWeekday = [];

  let startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  let endDate = addDays(startDate, 4);
  let formattedStartDate = format(startDate, "yyyy-MM-dd");
  let formattedEndDate = format(endDate, "yyyy-MM-dd");
  let daysOfWeek = [
    {
      name: "Monday",
      date: formattedStartDate,
    },
    {
      name: "Tuesday",
      date: format(addDays(startDate, 1), "yyyy-MM-dd"),
    },
    {
      name: "Wednesday",
      date: format(addDays(startDate, 2), "yyyy-MM-dd"),
    },
    {
      name: "Thursday",
      date: format(addDays(startDate, 3), "yyyy-MM-dd"),
    },
    {
      name: "Friday",
      date: formattedEndDate,
    },
  ];

  let currentDate = new Date();
  let currentWeekday = Math.min((currentDate.getDay() + 6) % 7, 4);
  let selectedWeekday = currentWeekday;

  function toggleDate(index) {
    if ($screenWidth > 640) {
      selectedWeekday = index;
    }
  }

  function clickWeekday(state, index) {
    if (state === "next" && selectedWeekday + 1 <= 4) {
      selectedWeekday = selectedWeekday + 1;
    } else if (state === "previous" && selectedWeekday - 1 >= 0) {
      selectedWeekday--;
    } else if (
      state === "previous" &&
      index === 0 &&
      differenceInWeeks(currentWeek, today) > -maxWeeksChange
    ) {
      changeWeek(state);
      selectedWeekday = 4;
    } else if (
      state === "next" &&
      index === 4 &&
      differenceInWeeks(currentWeek, today) < maxWeeksChange
    ) {
      changeWeek(state);
      selectedWeekday = 0;
    }
  }

  async function changeWeek(state) {
    //Limit the user to go back max 4 weeks and look forward 4 weeks
    if (
      state === "previous" &&
      differenceInWeeks(currentWeek, today) > -maxWeeksChange
    ) {
      currentWeek = subWeeks(currentWeek, 1);
    } else if (
      state === "next" &&
      differenceInWeeks(currentWeek, today) < maxWeeksChange
    ) {
      currentWeek = addWeeks(currentWeek, 1);
    }

    formattedMonday = startOfWeek(currentWeek, { weekStartsOn: 1 });
    formattedTuesday = format(addDays(formattedMonday, 1), "EEE, MMM d");
    formattedWednesday = format(addDays(formattedMonday, 2), "EEE, MMM d");
    formattedThursday = format(addDays(formattedMonday, 3), "EEE, MMM d");
    formattedFriday = format(addDays(formattedMonday, 4), "EEE, MMM d");
    formattedMonday = format(formattedMonday, "EEE, MMM d");

    formattedWeekday = [
      formattedMonday,
      formattedTuesday,
      formattedWednesday,
      formattedThursday,
      formattedFriday,
    ];
    weekday = [];
    rawWeekday = [];

    startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
    endDate = addDays(startDate, 4);
    formattedStartDate = format(startDate, "yyyy-MM-dd");
    formattedEndDate = format(endDate, "yyyy-MM-dd");
    daysOfWeek = [
      {
        name: "Monday",
        date: formattedStartDate,
      },
      {
        name: "Tuesday",
        date: format(addDays(startDate, 1), "yyyy-MM-dd"),
      },
      {
        name: "Wednesday",
        date: format(addDays(startDate, 2), "yyyy-MM-dd"),
      },
      {
        name: "Thursday",
        date: format(addDays(startDate, 3), "yyyy-MM-dd"),
      },
      {
        name: "Friday",
        date: formattedEndDate,
      },
    ];

    dividendCalendar = daysOfWeek?.map((day) => {
      return {
        name: day.name,
        data: data?.getDividendCalendar?.filter(
          (item) => item.date === day.date,
        ),
      };
    });

    if (dividendCalendar?.length) {
      // Loop through each day of the week
      for (let i = 0; i < dividendCalendar.length; i++) {
        const dayData = dividendCalendar[i].data;

        // Filter out entries with company name "---"

        // Sort and map the filtered data
        rawWeekday[i] = dayData?.sort((a, b) => b.marketCap - a.marketCap);
      }
      weekday = rawWeekday;
    }
  }

  $: {
    if (dividendCalendar) {
      dividendCalendar = daysOfWeek.map((day) => {
        return {
          name: day.name,
          data: data?.getDividendCalendar?.filter(
            (item) => item.date === day.date,
          ),
        };
      });

      if (dividendCalendar?.length) {
        // Loop through each day of the week
        for (let i = 0; i < dividendCalendar.length; i++) {
          const dayData = dividendCalendar[i].data;

          // Filter out entries with company name "---"

          // Sort and map the filtered data
          rawWeekday[i] = dayData.sort((a, b) => b.marketCap - a.marketCap);
        }
        weekday = rawWeekday;
      }
    }
  }

  $: {
    if (currentWeek) {
      if (differenceInWeeks(currentWeek, today) > -maxWeeksChange) {
        previousMax = false;
      } else {
        previousMax = true;
      }
    }
  }

  $: {
    if (currentWeek) {
      if (differenceInWeeks(currentWeek, today) < maxWeeksChange) {
        nextMax = false;
      } else {
        nextMax = true;
      }
    }
  }

  let columns = [
    { key: "symbol", label: "Symbol", align: "left" },
    { key: "name", label: "Name", align: "left" },
    { key: "marketCap", label: "Market Cap", align: "right" },
    { key: "revenue", label: "Revenue", align: "right" },
    { key: "adjDividend", label: "Cash Amount", align: "right" },
    { key: "date", label: "Ex-Dividend Date", align: "right" },
    { key: "paymentDate", label: "Payment Date", align: "right" },
  ];

  let sortOrders = {
    symbol: { order: "none", type: "string" },
    name: { order: "none", type: "string" },
    marketCap: { order: "none", type: "number" },
    revenue: { order: "none", type: "number" },
    adjDividend: { order: "none", type: "number" },
    paymentDate: { order: "none", type: "date" },
    date: { order: "none", type: "date" },
  };

  $: originalData = rawWeekday[selectedWeekday];

  const sortData = (key) => {
    // Reset all other keys to 'none' except the current key
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    // Cycle through 'none', 'asc', 'desc' for the clicked key
    const orderCycle = ["none", "asc", "desc"];

    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      weekday[selectedWeekday] = [...originalData]; // Reset to original data (spread to avoid mutation)
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
    weekday[selectedWeekday] = [...originalData]?.sort(compareValues);
  };
</script>

<SEO
  title="Dividend Calendar - Ex-Dividend Dates & Payment Schedule for Stocks"
  description="Track dividend payments with our comprehensive dividend calendar featuring ex-dividend dates, payment dates, and dividend amounts for all US dividend-paying stocks. Monitor upcoming dividend distributions, cash amounts, and payment schedules to optimize your dividend investment strategy and income planning."
  keywords="dividend calendar, ex-dividend dates, dividend payments, dividend schedule, dividend stocks, dividend income, dividend yields, payment dates, cash dividends, dividend distribution, dividend investing, income investing, dividend tracker, quarterly dividends"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dividend Calendar",
    description:
      "Comprehensive dividend calendar tracking ex-dividend dates, payment dates, and dividend amounts for US dividend-paying stocks",
    url: "https://stocknear.com/dividends-calendar",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web Browser",
    browserRequirements: "Modern web browser with JavaScript enabled",
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
          name: "Dividend Calendar",
          item: "https://stocknear.com/dividends-calendar",
        },
      ],
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Real-time dividend payment tracking",
      "Ex-dividend date notifications",
      "Payment date scheduling",
      "Dividend amount calculations",
      "Market capitalization filtering",
      "Weekly dividend calendar view",
      "Dividend history analysis",
      "Income planning tools",
    ],
    creator: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 px-4 lg:px-3 mb-20"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li class="text-muted dark:text-gray-300">Dividends Calendar</li>
    </ul>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:pr-5">
          <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px]">
            <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
              Dividends Calendar
            </h1>
          </div>

          <!-- Page wrapper -->
          <div class="flex justify-center w-full m-auto h-full overflow-hidden">
            <!-- Content area -->
            <div class="w-full overflow-x-auto">
              <!-- Cards -->
              <div
                class=" w-full flex flex-row justify-center m-auto items-center"
              >
                <!-- Start Columns -->
                <label
                  on:click={() => changeWeek("previous")}
                  class="{previousMax
                    ? 'opacity-80'
                    : ''} hidden sm:flex h-16 w-48 cursor-pointer border m-auto flex bg-default text-white dark:bg-primary border border-gray-300 dark:border-gray-600 mb-3"
                >
                  <svg
                    class="w-6 h-6 m-auto rotate-180"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    ><path
                      fill="currentColor"
                      d="M8.025 22L6.25 20.225L14.475 12L6.25 3.775L8.025 2l10 10l-10 10Z"
                    /></svg
                  >
                </label>
                {#each weekday as day, index}
                  <div
                    class="w-full {index === selectedWeekday
                      ? ''
                      : 'hidden sm:block'}"
                  >
                    <label
                      on:click={() => toggleDate(index)}
                      class=" m-auto w-full cursor-pointer h-16 {index ===
                      selectedWeekday
                        ? 'bg-default text-white dark:bg-white dark:text-black font-semibold'
                        : ''} rounded sm:rounded-none flex dark:bg-default border border-gray-300 dark:border-gray-600 mb-3"
                    >
                      <div
                        class=" flex flex-row justify-center items-center w-full"
                      >
                        <label
                          on:click={() => clickWeekday("previous", index)}
                          class="{previousMax === true && index === 0
                            ? 'opacity-20'
                            : ''} sm:hidden ml-auto"
                        >
                          <svg
                            class="w-8 h-8 inline-block rotate-180"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            ><path
                              fill="black"
                              d="M8.025 22L6.25 20.225L14.475 12L6.25 3.775L8.025 2l10 10l-10 10Z"
                            /></svg
                          >
                        </label>
                        <div
                          class="flex flex-col items-center truncate m-auto p-1"
                        >
                          <span class="text-[1rem]"
                            >{formattedWeekday[index]}</span
                          >
                          <span class="text-[1rem] sm:text-sm m-auto pt-1 pb-1">
                            {day?.length} Dividends</span
                          >
                        </div>
                        <label
                          on:click={() => clickWeekday("next", index)}
                          class="{nextMax === true && index === 4
                            ? 'opacity-20'
                            : ''} sm:hidden mr-auto"
                        >
                          <svg
                            class="w-8 h-8 inline-block"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            ><path
                              fill="black"
                              d="M8.025 22L6.25 20.225L14.475 12L6.25 3.775L8.025 2l10 10l-10 10Z"
                            /></svg
                          >
                        </label>
                      </div>
                    </label>
                  </div>
                {/each}
                <label
                  on:click={() => changeWeek("next")}
                  class="{nextMax
                    ? 'opacity-80'
                    : ''} hidden sm:flex h-16 w-48 cursor-pointer border m-auto flex bg-default text-white dark:bg-primary border border-gray-300 dark:border-gray-600 mb-3"
                >
                  <svg
                    class="w-6 h-6 m-auto"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    ><path
                      fill="currentColor"
                      d="M8.025 22L6.25 20.225L14.475 12L6.25 3.775L8.025 2l10 10l-10 10Z"
                    /></svg
                  >
                </label>
              </div>

              {#each weekday as day, index}
                {#if index === selectedWeekday}
                  {#if day?.length !== 0}
                    <h2 class="font-semibold text-xl mt-5">
                      {formattedWeekday[index]?.split(", ")[1]} · {day?.length} Dividends
                    </h2>

                    <div class="w-full overflow-x-auto no-scrollbar">
                      <table
                        class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
                      >
                        <thead>
                          <TableHeader {columns} {sortOrders} {sortData} />
                        </thead>
                        <tbody>
                          {#each day as item}
                            <!-- row -->
                            <tr
                              class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                            >
                              <td class=" text-sm sm:text-[1rem]">
                                <HoverStockChart symbol={item?.symbol} />
                              </td>

                              <td
                                class=" whitespace-nowrap text-sm sm:text-[1rem]"
                              >
                                {item?.name.length > 20
                                  ? item?.name.slice(0, 20) + "..."
                                  : item?.name}
                              </td>

                              <td class=" text-sm text-end sm:text-[1rem]">
                                {@html item?.marketCap !== null
                                  ? abbreviateNumber(
                                      item?.marketCap,
                                      false,
                                      true,
                                    )
                                  : "n/a"}
                              </td>

                              <td class=" text-sm sm:text-[1rem] text-end">
                                {item?.revenue !== null
                                  ? abbreviateNumber(item?.revenue)
                                  : "n/a"}
                              </td>

                              <td
                                class=" text-center text-sm sm:text-[1rem] text-end"
                              >
                                {item?.adjDividend !== null
                                  ? item?.adjDividend?.toFixed(3)
                                  : "n/a"}
                              </td>

                              <td class=" text-end text-sm sm:text-[1rem]">
                                {item?.date !== null
                                  ? new Date(item?.date)?.toLocaleString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        daySuffix: "2-digit",
                                        timeZone: "UTC",
                                      },
                                    )
                                  : "n/a"}
                              </td>

                              <td class=" text-end text-sm sm:text-[1rem]">
                                {item?.paymentDate !== null
                                  ? new Date(item?.paymentDate)?.toLocaleString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        daySuffix: "2-digit",
                                        timeZone: "UTC",
                                      },
                                    )
                                  : "n/a"}
                              </td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {:else}
                    <div class="mt-5">
                      <Infobox text="No Dividends available for the day." />
                    </div>
                  {/if}
                {/if}
              {/each}
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</section>
