<script lang="ts">
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import UpgradeToPro from "$lib/components/UpgradeToPro.svelte";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  import { onMount } from "svelte";

  export let data;
  export let ticker = null;
  export let assetType = "stocks";

  const currentTime = new Date(
    new Date().toLocaleString("en-US", { timeZone: "UTC" }),
  )?.getTime();

  let rawData = data?.getData
    ?.map((item) => ({
      ...item,
      dte: daysLeft(item?.expiry),
    }))
    ?.sort((a, b) => new Date(b?.date) - new Date(a?.date));

  // Track the currently sorted data separately
  let sortedData = [...rawData];
  let displayList = sortedData?.slice(0, 50) || [];
  let currentSortKey = null;
  let currentSortOrder = "none";

  let config = null;

  function daysLeft(targetDate) {
    const targetTime = new Date(targetDate).getTime();
    const difference = targetTime - currentTime;

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math?.ceil(difference / millisecondsPerDay);

    return daysLeft + "D";
  }

  function formatDate(dateStr) {
    // Convert the input date string to a Date object in UTC
    let date = new Date(dateStr + "T00:00:00Z"); // Assume input is in UTC
    let options = {
      timeZone: "UTC",
      month: "short", // Changed from "2-digit" to "short" for "Jan"
      day: "numeric", // Changed from "2-digit" to "numeric" for "17" (no leading zero)
      year: "numeric", // Changed from "2-digit" to "numeric" for "2025"
    };
    let formatter = new Intl.DateTimeFormat("en-US", options);
    return formatter.format(date);
  }

  function plotData() {
    let dates = [];
    let priceList = [];

    // Sort history by date
    const history = rawData?.sort(
      (a, b) => new Date(a?.date) - new Date(b?.date),
    );

    // Aggregate premiums for each date and track bubble data
    const aggregatedData = {};
    const callBubbleData = [];
    const putBubbleData = [];

    history?.forEach((item) => {
      const { date, optionType, size, premium } = item;

      if (!aggregatedData[date]) {
        aggregatedData[date] = {
          callPremiums: [],
          putPremiums: [],
        };
      }

      if (optionType === "Calls") {
        aggregatedData[date].callPremiums.push({ size, premium });
      } else if (optionType === "Puts") {
        aggregatedData[date].putPremiums.push({ size, premium });
      }
    });

    // Build dates array from aggregated data
    dates = Object.keys(aggregatedData);

    // Get historical prices for matching dates
    priceList = dates?.map((date) => {
      const matchingData = data?.getHistoricalPrice?.find(
        (d) => d?.time === date,
      );
      return matchingData?.close || null;
    });

    // Calculate premium statistics for better visualization
    const allPremiums = history?.map((item) => item.premium) || [];
    const maxPremium = Math.max(...allPremiums, 0);
    const minPremium = Math.min(...allPremiums.filter((p) => p > 0), 0);
    const avgPremium =
      allPremiums.reduce((sum, p) => sum + p, 0) / (allPremiums.length || 1);

    // Optional: Set a minimum threshold if you want to filter out very small values
    // Set to 0 to show all premiums, or to a small value to filter noise
    const minimumPremiumToShow = 0; // Show all premiums

    // Create bubble data for ALL options (or those above minimum)
    dates.forEach((date, index) => {
      const dateData = aggregatedData[date];
      const price = priceList[index];

      if (price) {
        // Process call premiums
        dateData.callPremiums.forEach(({ size, premium }) => {
          // Include all premiums above the minimum threshold
          if (premium >= minimumPremiumToShow) {
            callBubbleData.push({
              x: index,
              y: price,
              z: premium,
              name: `Call: ${size.toLocaleString()} contracts`,
              date: date,
              // Add impact level for tooltip
              impact:
                premium > avgPremium * 2
                  ? "Very High"
                  : premium > avgPremium * 1.5
                    ? "High"
                    : premium > avgPremium
                      ? "Above Average"
                      : "Below Average",
            });
          }
        });

        // Process put premiums
        dateData.putPremiums.forEach(({ size, premium }) => {
          // Include all premiums above the minimum threshold
          if (premium >= minimumPremiumToShow) {
            putBubbleData.push({
              x: index,
              y: price,
              z: premium,
              name: `Put: ${size.toLocaleString()} contracts`,
              date: date,
              // Add impact level for tooltip
              impact:
                premium > avgPremium * 2
                  ? "Very High"
                  : premium > avgPremium * 1.5
                    ? "High"
                    : premium > avgPremium
                      ? "Above Average"
                      : "Below Average",
            });
          }
        });
      }
    });

    // Highcharts configuration
    const options = {
      credits: {
        enabled: false,
      },
      plotOptions: {
        series: {
          animation: false,
          states: {
            hover: {
              enabled: false,
            },
          },
        },
        bubble: {
          // Increased minSize to ensure small premiums are visible
          minSize: 1, // Increased from 8 to make small bubbles more visible
          maxSize: 50,
          // Optional: Use sizeBy to control how bubble size is calculated
          sizeBy: "width", // Can be 'area' or 'width'
          marker: {
            fillOpacity: 0.6,
            lineWidth: 2,
          },
          dataLabels: {
            enabled: false,
          },
          // Optional: Set a minimum bubble value to ensure visibility
          // This ensures even the smallest premium gets the minSize bubble
          zMin: minPremium > 0 ? minPremium : 1,
          zMax: maxPremium,
        },
      },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        height: 360,
        animation: false,
      },
      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg">Unusual Options Activity</h3>`,
        useHTML: true,
        style: {
          color: $mode === "light" ? "black" : "white",
        },
      },
      xAxis: {
        categories: dates,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: {
            color: $mode === "light" ? "#545454" : "white",
          },
          formatter: function () {
            // Only format if this.value is a valid date string
            if (this.value && typeof this.value === "string") {
              const date = new Date(this.value);
              // Check if date is valid
              if (!isNaN(date.getTime())) {
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                });
              }
            }
            return "";
          },
          // Show fewer labels to avoid crowding
          step: Math.ceil(dates.length / 5),
        },
      },
      yAxis: {
        gridLineWidth: 1,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
        labels: {
          style: { color: $mode === "light" ? "#545454" : "white" },
        },
        title: { text: null },
        opposite: true,
      },
      tooltip: {
        shared: false,
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        style: {
          color: "#fff",
          fontSize: "16px",
          padding: "10px",
        },
        borderRadius: 4,
        formatter: function () {
          let tooltipContent = "";

          if (this.series.type === "bubble") {
            const date = new Date(this.point.date);
            tooltipContent = `<span class="m-auto text-[1rem] font-[501]">${date.toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              },
            )}</span><br>`;

            tooltipContent += `<span class="font-semibold text-sm">${this.series.name}</span><br>`;
            tooltipContent += `<span class="font-normal text-sm">Price: $${this.point.y?.toFixed(2)}</span><br>`;
            tooltipContent += `<span class="font-normal text-sm">Premium: $${this.point.z?.toLocaleString("en-US")}</span><br>`;
            tooltipContent += `<span class="font-normal text-xs">Impact: ${this.point.impact || "N/A"}</span>`;
          } else {
            // For spline series, use the category value directly
            const dateStr = dates[this.point.index] || this.x;
            const date = new Date(dateStr);

            tooltipContent = `<span class="m-auto text-[1rem] font-[501]">${date.toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              },
            )}</span><br>`;

            tooltipContent += `
            <span style="display:inline-block; width:10px; height:10px; background-color:${this.color}; border-radius:50%; margin-right:5px;"></span>
            <span class="font-semibold text-sm">${this.series.name}:</span> 
            <span class="font-normal text-sm">$${this.y?.toFixed(2)}</span>`;
          }

          return tooltipContent;
        },
      },
      series: [
        {
          name: "Stock Price",
          type: "spline",
          data: priceList,
          marker: {
            enabled: false,
          },
          color: $mode === "light" ? "#000" : "#fff",
          lineWidth: 1.5,
          zIndex: 2,
        },
        {
          name: "Call Options", // Updated name to be more inclusive
          type: "bubble",
          data: callBubbleData,
          color: "#00FC50",
          zIndex: 3,
          marker: {
            lineColor: "rgba(0, 252, 80, 0.8)",
          },
        },
        {
          name: "Put Options", // Updated name to be more inclusive
          type: "bubble",
          data: putBubbleData,
          color: "#EE5365",
          zIndex: 3,
          marker: {
            lineColor: "rgba(238, 83, 101, 0.8)",
          },
        },
      ],
      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "top",
        layout: "horizontal",
        itemStyle: {
          color: $mode === "light" ? "black" : "white",
        },
      },
    };

    return options;
  }

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && displayList?.length !== sortedData?.length) {
      const nextIndex = displayList?.length;
      // Use sortedData instead of rawData to maintain sort order
      const filteredNewResults = sortedData?.slice(nextIndex, nextIndex + 50);
      displayList = [...displayList, ...filteredNewResults];
    }
  }

  onMount(async () => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  $: columns = [
    { key: "optionType", label: "Type", align: "left" },
    { key: "date", label: "Transaction Date", align: "left" },
    { key: "dte", label: "DTE", align: "right" },
    { key: "unusualType", label: "Type", align: "right" },
    { key: "executionEst", label: "Exec", align: "right" },
    { key: "sentiment", label: "Sent.", align: "right" },
    { key: "size", label: "Size", align: "right" },
    { key: "price", label: "Spot", align: "right" },
    { key: "premium", label: "Prem", align: "right" },
    { key: "optionSymbol", label: "Option Chain", align: "right" },
  ];

  $: sortOrders = {
    optionType: { order: "none", type: "string" },
    date: { order: "none", type: "date" },
    optionSymbol: { order: "none", type: "string" },
    unusualType: { order: "none", type: "string" },
    executionEst: { order: "none", type: "string" },
    dte: { order: "none", type: "number" },
    sentiment: { order: "none", type: "sentiment" },
    size: { order: "none", type: "number" },
    price: { order: "none", type: "number" },
    premium: { order: "none", type: "number" },
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
    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Update tracking variables
    currentSortKey = key;
    currentSortOrder = sortOrder;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      sortedData = [...rawData];
      displayList = sortedData?.slice(0, 50); // Start with 50 items
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
        case "sentiment":
          const sentimentOrder = { BULLISH: 1, NEUTRAL: 2, BEARISH: 3 };
          const sentimentA = sentimentOrder[a?.sentiment?.toUpperCase()] || 4;
          const sentimentB = sentimentOrder[b?.sentiment?.toUpperCase()] || 4;
          return sortOrder === "asc"
            ? sentimentA - sentimentB
            : sentimentB - sentimentA;

        case "number":
        default:
          valueA = parseFloat(a[key]);
          valueB = parseFloat(b[key]);
          break;
      }

      // Default comparison for numbers and fallback case
      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    };

    // Sort all data and store it
    sortedData = [...rawData].sort(compareValues);
    // Display the first batch of sorted data (preserve current display count)
    const currentDisplayCount = Math.min(displayList.length, 50);
    displayList = sortedData?.slice(0, currentDisplayCount);
  };

  $: {
    if ($mode) {
      config = plotData() || null;
    }
  }
</script>

<section class="w-full overflow-hidden min-h-screen pb-40">
  <div class="w-full flex h-full overflow-hidden">
    <div
      class="w-full relative flex justify-center items-center overflow-hidden"
    >
      <div class="sm:pl-7 sm:pb-7 sm:pt-7 w-full m-auto mt-2 sm:mt-0">
        <h2
          class=" flex flex-row items-center text-xl sm:text-2xl font-bold w-fit mb-2 sm:mb-0"
        >
          {ticker} Unusual Activity
        </h2>
        <p class={rawData?.length > 0 ? "mt-4" : "mt-0"}>
          {#if rawData?.length > 0}
            {@const totalPremium = rawData.reduce(
              (sum, item) => sum + (item.premium || 0),
              0,
            )}
            {@const callCount = rawData.filter(
              (item) => item.optionType === "Calls",
            ).length}
            {@const putCount = rawData.filter(
              (item) => item.optionType === "Puts",
            ).length}
            {@const bullishCount = rawData.filter(
              (item) => item.sentiment === "Bullish",
            ).length}
            {@const bearishCount = rawData.filter(
              (item) => item.sentiment === "Bearish",
            ).length}
            {@const avgDTE = Math.round(
              rawData.reduce((sum, item) => sum + parseInt(item.dte || 0), 0) /
                rawData.length,
            )}
            {@const recentActivity = rawData.filter((item) => {
              const daysDiff =
                (currentTime - new Date(item.date).getTime()) /
                (1000 * 60 * 60 * 24);
              return daysDiff <= 7;
            }).length}
            {@const largestPremium = Math.max(
              ...rawData.map((item) => item.premium || 0),
            )}
            {@const sweepCount = rawData.filter(
              (item) => item.unusualType === "Sweep",
            ).length}

            <strong>{ticker}</strong> has recorded
            <strong>{rawData.length}</strong>
            unusual options
            {rawData.length === 1 ? "trade" : "trades"} with a total premium of
            <strong>${totalPremium.toLocaleString("en-US")}</strong>. The
            activity is split between <strong>{callCount}</strong> call
            {callCount === 1 ? "order" : "orders"} ({(
              (callCount / rawData.length) *
              100
            ).toFixed(1)}%) and
            <strong>{putCount}</strong> put {putCount === 1
              ? "order"
              : "orders"}
            ({((putCount / rawData.length) * 100).toFixed(1)}%),
            {@html callCount > putCount
              ? `showing a <strong class="text-green-800 dark:text-[#00FC50]">bullish skew</strong>`
              : putCount > callCount
                ? `showing a <strong class="text-red-800 dark:text-[#FF2F1F]">bearish skew</strong>`
                : `showing <strong>balanced</strong> positioning`}. Sentiment
            analysis reveals
            <strong
              >{((bullishCount / rawData.length) * 100).toFixed(0)}%</strong
            >
            bullish and
            <strong
              >{((bearishCount / rawData.length) * 100).toFixed(0)}%</strong
            >
            bearish positioning
            {@html bullishCount > bearishCount * 1.5
              ? ", indicating <strong>strong bullish conviction</strong>"
              : bearishCount > bullishCount * 1.5
                ? ", indicating <strong>strong bearish conviction</strong>"
                : ", showing <strong>mixed market sentiment</strong>"}. The
            average days to expiration is <strong>{avgDTE} days</strong>
            {@html avgDTE < 7
              ? ", suggesting <strong>near-term catalysts expected</strong>"
              : avgDTE > 30
                ? ", indicating <strong>longer-term positioning</strong>"
                : ", reflecting <strong>intermediate-term outlook</strong>"}.
            {@html recentActivity > 0 &&
              `In the past week alone, <strong>${recentActivity}</strong> 
        ${recentActivity === 1 ? "trade has" : "trades have"} been executed
        ${
          recentActivity > rawData.length * 0.5
            ? ", showing <strong>accelerating institutional interest</strong>."
            : ","
        }`}
            {@html sweepCount > 0 &&
              ` <strong>${sweepCount}</strong> ${sweepCount === 1 ? "order was" : "orders were"} 
        executed as ${sweepCount === 1 ? "a sweep" : "sweeps"}, 
        ${
          sweepCount > rawData.length * 0.3
            ? "indicating <strong>urgent positioning</strong>"
            : "suggesting <strong>aggressive execution</strong>"
        }.`}
            The largest single premium was
            <strong>${largestPremium.toLocaleString("en-US")}</strong>
            {largestPremium > totalPremium * 0.2
              ? ", representing a <strong>significant institutional bet</strong>"
              : ""}.
          {/if}
        </p>

        <div>
          <div class="grow mt-5">
            <div class="relative">
              <!-- Apply the blur class to the chart -->
              <div
                class="mt-5 shadow-xs sm:mt-0 sm:border sm:border-gray-300 dark:border-gray-800 rounded"
                use:highcharts={config}
              ></div>
            </div>
          </div>
        </div>

        <div class="w-full overflow-x-auto">
          <table
            class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
          >
            <thead>
              <TableHeader {columns} {sortOrders} {sortData} />
            </thead>
            <tbody>
              {#each data?.user?.tier !== "Pro" ? displayList?.slice(0, 3) : displayList as item, index}
                <tr
                  class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd {index +
                    1 ===
                    rawData?.slice(0, 3)?.length &&
                  !['Pro']?.includes(data?.user?.tier)
                    ? 'opacity-[0.1]'
                    : ''}"
                >
                  <td
                    class=" text-sm sm:text-[1rem] text-start whitespace-nowrap flex flex-row items-center justify-between"
                  >
                    <span
                      class={item?.optionType === "Calls"
                        ? "dark:text-[#00FC50]"
                        : "dark:text-[#FF2F1F]"}
                    >
                      {item?.optionType === "Calls" ? "Call" : "Put"}
                      {" " + item?.strike}
                    </span>
                  </td>

                  <td
                    class=" text-sm sm:text-[1rem] text-start whitespace-nowrap"
                  >
                    {formatDate(item?.date)}
                  </td>

                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.dte}
                  </td>

                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.unusualType}
                  </td>

                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.executionEst}
                  </td>

                  <td
                    class="text-sm sm:text-[1rem] text-end whitespace-nowrap {item?.sentiment ===
                    'Bullish'
                      ? 'text-green-800 dark:text-[#00FC50]'
                      : item?.sentiment === 'Bearish'
                        ? 'text-red-800 dark:text-[#FF2F1F]'
                        : 'text-orange-800 dark:text-[#C8A32D]'} "
                  >
                    {item?.sentiment}
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.size?.toLocaleString("en-US")}
                  </td>

                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.price}
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    ${item?.premium?.toLocaleString("en-US")}
                  </td>

                  <td class="text-sm sm:text-[1rem] text-end whitespace-nowrap">
                    <a
                      href={`/${["stocks", "stock"]?.includes(assetType) ? "stocks" : assetType === "etf" ? "etf" : "index"}/${ticker}/options/contract-lookup?query=${item?.optionSymbol}`}
                      class="cursor-pointer text-blue-800 sm:hover:text-muted dark:text-blue-400 dark:sm:hover:text-white"
                    >
                      {item?.optionSymbol}
                    </a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <UpgradeToPro {data} display={true} />
      </div>
    </div>
  </div>
</section>
