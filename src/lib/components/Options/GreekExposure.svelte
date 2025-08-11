<script lang="ts">
  import { abbreviateNumber } from "$lib/utils";
  import { onMount } from "svelte";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import UpgradeToPro from "$lib/components/UpgradeToPro.svelte";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  export let data;
  export let title;
  export let ticker;

  let rawData =
    data?.getData?.sort((a, b) => new Date(b?.date) - new Date(a?.date)) || [];

  rawData = rawData?.map((item) => {
    if (title === "Gamma") {
      return {
        ...item,
        putCallRatio:
          item?.call_gex > 0
            ? Math.abs((item?.put_gex || 0) / item?.call_gex)
            : null,
      };
    } else {
      return {
        ...item,
        putCallRatio:
          item?.call_dex > 0
            ? Math.abs((item?.put_dex || 0) / item?.call_dex)
            : null,
      };
    }
  });

  let displayList = rawData?.slice(0, 150);
  let timePeriod = "3M";

  // Calculate metrics for insight paragraph
  $: currentExposure = rawData?.[0]
    ? title === "Gamma"
      ? rawData[0].netGex
      : rawData[0].netDex
    : 0;

  $: periodData = (() => {
    const history = data?.getData?.sort(
      (a, b) => new Date(a?.date) - new Date(b?.date),
    );
    const { dateList, dataList } = filterDataByPeriod(history, timePeriod);
    return dataList || [];
  })();

  $: averageExposure =
    periodData.length > 0
      ? periodData.reduce((sum, val) => sum + val, 0) / periodData.length
      : 0;

  $: maxExposure = periodData.length > 0 ? Math.max(...periodData) : 0;

  $: minExposure = periodData.length > 0 ? Math.min(...periodData) : 0;

  // Calculate recent trend (last 5 days vs previous 5 days)
  $: recentTrend = (() => {
    if (rawData.length < 10) return "stable";
    const recent5 =
      rawData
        .slice(0, 5)
        .reduce(
          (sum, item) => sum + (title === "Gamma" ? item.netGex : item.netDex),
          0,
        ) / 5;
    const previous5 =
      rawData
        .slice(5, 10)
        .reduce(
          (sum, item) => sum + (title === "Gamma" ? item.netGex : item.netDex),
          0,
        ) / 5;

    const change = ((recent5 - previous5) / Math.abs(previous5)) * 100;
    if (Math.abs(change) < 10) return "stable";
    return change > 0 ? "increasing" : "decreasing";
  })();

  // Calculate volatility (standard deviation)
  $: exposureVolatility = (() => {
    if (periodData.length < 2) return 0;
    const mean = averageExposure;
    const squaredDiffs = periodData.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / periodData.length;
    return Math.sqrt(avgSquaredDiff);
  })();

  $: currentPutCallRatio = rawData?.[0]?.putCallRatio || 0;

  $: averagePutCallRatio =
    rawData
      .slice(0, 20)
      .reduce((sum, item) => sum + (item.putCallRatio || 0), 0) /
      Math.min(20, rawData.length) || 0;

  // Find date of max and min exposure in period
  $: maxExposureDate = (() => {
    const history = data?.getData?.sort(
      (a, b) => new Date(a?.date) - new Date(b?.date),
    );
    const filtered = filterDataByPeriod(history, timePeriod);
    const maxIndex = filtered.dataList?.indexOf(maxExposure);
    return maxIndex >= 0 ? formatDate(filtered.dateList[maxIndex]) : "n/a";
  })();

  $: minExposureDate = (() => {
    const history = data?.getData?.sort(
      (a, b) => new Date(a?.date) - new Date(b?.date),
    );
    const filtered = filterDataByPeriod(history, timePeriod);
    const minIndex = filtered.dataList?.indexOf(minExposure);
    return minIndex >= 0 ? formatDate(filtered.dateList[minIndex]) : "n/a";
  })();

  let config = null;

  function filterDataByPeriod(historicalData, period = "3M") {
    const currentDate = new Date();
    let startDate = new Date();

    // Calculate the start date based on the period input
    switch (period) {
      case "3M":
        startDate.setMonth(currentDate.getMonth() - 3);
        break;
      case "6M":
        startDate.setMonth(currentDate.getMonth() - 6);
        break;
      case "1Y":
        startDate.setFullYear(currentDate.getFullYear() - 1);
        break;
      default:
        throw new Error(`Unsupported period: ${period}`);
    }

    // Filter the data based on the calculated start date
    let filteredData =
      historicalData?.filter((item) => {
        if (!item || !item.date) return false; // Ensure item and date are valid
        const itemDate = new Date(item.date);
        return (
          !isNaN(itemDate) && itemDate >= startDate && itemDate <= currentDate
        );
      }) || [];

    filteredData.forEach((entry) => {
      const matchingData = data?.getHistoricalPrice?.find(
        (d) => d?.time === entry?.date,
      );
      if (matchingData) {
        entry.price = matchingData?.close ?? null; // Ensure price is valid
      }
    });

    // Extract the dates and gamma values from the filtered data
    const dateList = filteredData
      .map((item) => item.date)
      .filter((date) => date != null); // Filter out null/undefined

    const dataList = filteredData
      .map((item) => (title === "Gamma" ? item.netGex : item.netDex))
      .filter((value) => value != null); // Filter out null/undefined

    const priceList = filteredData
      .map((item) => item.price)
      .filter((price) => price != null); // Filter out null/undefined

    return { dateList, dataList, priceList };
  }

  function plotData() {
    const history = data?.getData?.sort(
      (a, b) => new Date(a?.date) - new Date(b?.date),
    );
    const { dateList, dataList, priceList } = filterDataByPeriod(
      history,
      timePeriod,
    );

    const options = {
      credits: {
        enabled: false,
      },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        height: 360,
        animation: false,
      },
      title: {
        text: `<h3 class="mt-3 -mb-2 ">${ticker} ${title === "Gamma" ? "GEX" : "DEX"} Chart</h3>`,
        style: {
          color: $mode === "light" ? "black" : "white",
          // Using inline CSS for margin-top and margin-bottom
        },
        useHTML: true, // Enable HTML to apply custom class styling
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)", // Semi-transparent black
        borderColor: "rgba(255, 255, 255, 0.2)", // Slightly visible white border
        borderWidth: 1,
        style: {
          color: "#fff",
          fontSize: "16px",
          padding: "10px",
        },
        borderRadius: 4,
        formatter: function () {
          // Format the x value to display time in a custom format
          let tooltipContent = `<span class="m-auto text-[1rem] font-[501]">${new Date(
            this?.x,
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}</span><br>`;

          // Loop through each point in the shared tooltip
          this.points.forEach((point) => {
            tooltipContent += `
        <span style="display:inline-block; width:10px; height:10px; background-color:${point.color}; border-radius:50%; margin-right:5px;"></span>
        <span class="font-semibold text-sm">${point.series.name}:</span> 
        <span class="font-normal text-sm">${point.y?.toLocaleString("en-US")}</span><br>`;
          });

          return tooltipContent;
        },
      },
      xAxis: {
        type: "datetime",
        endOnTick: false,
        categories: dateList,
        crosshair: {
          color: $mode === "light" ? "black" : "white", // Set the color of the crosshair line
          width: 1, // Adjust the line width as needed
          dashStyle: "Solid",
        },
        labels: {
          style: {
            color: $mode === "light" ? "#545454" : "white",
          },
          distance: 20, // Increases space between label and axis
          formatter: function () {
            const date = new Date(this.value);
            return date.toLocaleDateString("en-US", {
              day: "2-digit", // Include day number
              month: "short", // Display short month name
              timeZone: "UTC",
            });
          },
        },
      },

      yAxis: [
        {
          gridLineWidth: 1,
          gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
          labels: {
            style: { color: $mode === "light" ? "#545454" : "white" },
            formatter: function () {
              return abbreviateNumber(this.value);
            },
          },
          title: { text: null },
          opposite: true,
        },
        {
          title: { text: "" },
          gridLineWidth: 0,
          labels: { enabled: false },
        },
      ],
      series: [
        {
          name: "Stock Price",
          type: "spline",
          data: priceList,
          yAxis: 1,
          color: $mode === "light" ? "black" : "#fff",
          lineWidth: 1.3,
          zIndex: 10,
          marker: { enabled: false },
          animation: false,
        },
        {
          name: title,
          type: "column",
          data: dataList,
          color: $mode === "light" ? "#2C6288" : "#9B5DC4",
          borderColor: $mode === "light" ? "#2C6288" : "#9B5DC4",
          borderRadius: "1px",
          animation: false,
        },
      ],
      legend: {
        enabled: true,
        align: "center", // left side
        verticalAlign: "top", // top edge
        layout: "horizontal",
        squareSymbol: false, // use our rectangle shape
        symbolWidth: 20,
        symbolHeight: 12,
        symbolRadius: 0,

        itemStyle: {
          color: $mode === "light" ? "black" : "white",
        },
      },
      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
          states: { hover: { enabled: false } },
          legendSymbol: "rectangle",
        },
      },
    };

    return options;
  }

  function formatDate(dateStr) {
    // Convert the input date string to a Date object
    let date = new Date(dateStr + "T00:00:00Z"); // Assume input is in UTC

    // Format as "Feb 15, 2025"
    let options = {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    let formatter = new Intl.DateTimeFormat("en-US", options);
    return formatter.format(date);
  }
  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;

    if (isBottom && displayList?.length !== rawData?.length) {
      const nextIndex = displayList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 50);
      displayList = [...displayList, ...filteredNewResults];
    }
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  $: columns =
    title === "Gamma"
      ? [
          { key: "date", label: "Date", align: "left" },
          { key: "call_gex", label: "Call GEX", align: "right" },
          { key: "put_gex", label: "Put GEX", align: "right" },
          { key: "netGex", label: "Net GEX", align: "right" },
          { key: "putCallRatio", label: "P/C GEX", align: "right" },
        ]
      : [
          { key: "date", label: "Date", align: "left" },
          { key: "call_dex", label: "Call Delta", align: "right" },
          { key: "put_dex", label: "Put Delta", align: "right" },
          { key: "netDex", label: "Net Delta", align: "right" },
          { key: "putCallRatio", label: "P/C Delta", align: "right" },
        ];

  $: sortOrders =
    title === "Gamma"
      ? {
          date: { order: "none", type: "date" },
          call_gex: { order: "none", type: "number" },
          put_gex: { order: "none", type: "number" },
          netGex: { order: "none", type: "number" },
          putCallRatio: { order: "none", type: "number" },
        }
      : {
          date: { order: "none", type: "date" },
          call_dex: { order: "none", type: "number" },
          put_dex: { order: "none", type: "number" },
          netDex: { order: "none", type: "number" },
          putCallRatio: { order: "none", type: "number" },
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
      originalData = [...rawData]; // Reset originalData to rawDataVolume
      displayList = originalData;
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
    displayList = [...originalData].sort(compareValues);
  };

  $: {
    if (timePeriod || $mode) {
      config = plotData();
    }
  }
</script>

<div class="sm:pl-7 sm:pb-7 sm:pt-7 w-full m-auto mt-2 sm:mt-0">
  <h2 class=" flex flex-row items-center text-xl sm:text-2xl font-bold w-fit">
    {ticker} Daily {title} Exposure
  </h2>

  <!-- Insightful overview paragraph -->
  <div class="w-full mt-4 mb-6">
    <p>
      {#if title === "Gamma"}
        Current Gamma Exposure (GEX) is
        <strong>{abbreviateNumber(currentExposure)}</strong>, which is
        {currentExposure > averageExposure
          ? `${((currentExposure / averageExposure - 1) * 100).toFixed(0)}% above`
          : `${((1 - currentExposure / averageExposure) * 100).toFixed(0)}% below`}
        the {timePeriod} average of
        <strong>{abbreviateNumber(averageExposure)}</strong>. Over this period,
        GEX peaked at
        <strong>{abbreviateNumber(maxExposure)}</strong>
        on {maxExposureDate}
        and bottomed at
        <strong>{abbreviateNumber(minExposure)}</strong>
        on {minExposureDate},
        {maxExposure > 0 && minExposure < 0
          ? "showing a shift between positive and negative gamma regimes"
          : maxExposure > 0 && minExposure > 0
            ? "maintaining consistently positive gamma throughout"
            : "remaining in negative gamma territory"}. The exposure has been
        <strong>{recentTrend}</strong>
        recently,
        {recentTrend === "increasing" && currentExposure > 0
          ? "suggesting growing dealer hedging that could dampen volatility"
          : recentTrend === "decreasing" && currentExposure < 0
            ? "indicating reduced hedging flows that may amplify price swings"
            : recentTrend === "stable"
              ? "indicating steady positioning"
              : "signaling a shift in market maker hedging dynamics"}. Today's
        put-call gamma ratio of
        <strong>{currentPutCallRatio?.toFixed(2)}</strong>
        {currentPutCallRatio > averagePutCallRatio
          ? `is elevated versus the recent average of ${averagePutCallRatio.toFixed(2)}, suggesting increased put hedging`
          : `is below the recent average of ${averagePutCallRatio.toFixed(2)}, indicating call-heavy positioning`}.
        {exposureVolatility > Math.abs(averageExposure) * 0.5
          ? ` High GEX volatility (±${abbreviateNumber(exposureVolatility)}) suggests frequent repositioning and potential regime changes.`
          : ` Stable GEX patterns (±${abbreviateNumber(exposureVolatility)}) indicate consistent market maker positioning.`}
      {:else}
        <strong>{ticker}</strong>'s current Delta Exposure (DEX) is
        <strong>{abbreviateNumber(currentExposure)}</strong> shares, which is
        {Math.abs(currentExposure) > Math.abs(averageExposure)
          ? `${((Math.abs(currentExposure) / Math.abs(averageExposure) - 1) * 100).toFixed(0)}% larger`
          : `${((1 - Math.abs(currentExposure) / Math.abs(averageExposure)) * 100).toFixed(0)}% smaller`}
        than the {timePeriod} average of
        <strong>{abbreviateNumber(averageExposure)}</strong>
        shares. During this period, DEX ranged from
        <strong>{abbreviateNumber(minExposure)}</strong>
        on {minExposureDate}
        to <strong>{abbreviateNumber(maxExposure)}</strong> on {maxExposureDate},
        {maxExposure > 0 && minExposure < 0
          ? "swinging between net long and short dealer positioning"
          : maxExposure > 0 && minExposure >= 0
            ? "with dealers maintaining net short exposure requiring continuous hedging"
            : "with dealers consistently net long, providing natural buying support"}.
        Delta exposure has been <strong>{recentTrend}</strong> recently,
        {recentTrend === "increasing" && currentExposure > 0
          ? "forcing increased dealer shorting that could cap rallies"
          : recentTrend === "decreasing" && currentExposure < 0
            ? "reducing dealer buying pressure that supported recent moves"
            : recentTrend === "stable"
              ? "maintaining steady hedging requirements"
              : "shifting the directional hedging pressure"}. The current
        put-call delta ratio of
        <strong>{currentPutCallRatio?.toFixed(2)}</strong>
        {currentPutCallRatio > 1.2
          ? "signals heavy put positioning that could accelerate downside moves"
          : currentPutCallRatio < 0.8
            ? "shows bullish call positioning but leaves the market vulnerable to pullbacks"
            : "reflects balanced options positioning"}.
        {Math.abs(currentExposure) > Math.abs(maxExposure) * 0.8
          ? ` Near extreme DEX levels suggest potential for mean reversion as positions unwind.`
          : Math.abs(currentExposure) < Math.abs(averageExposure) * 0.5
            ? ` Relatively low DEX indicates reduced hedging flows and potential for increased volatility.`
            : ` Moderate DEX levels suggest normal market maker hedging activity.`}
      {/if}
    </p>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5">
    {#if config !== null}
      <div class="flex justify-end space-x-2 ml-auto mb-3">
        {#each ["3M", "6M", "1Y"] as item, index}
          {#if data?.user?.tier === "Pro" || index === 0}
            <label
              on:click={() => (timePeriod = item)}
              class="px-3 py-1 text-sm shadow-xs border border-gray-300 dark:border-gray-600 {timePeriod ===
              item
                ? 'bg-black dark:bg-white text-white dark:text-black '
                : ' bg-gray-100 dark:bg-table shadow'}  rounded cursor-pointer"
            >
              {item}
            </label>
          {:else if data?.user?.tier !== "Pro"}
            <a
              href="/pricing"
              class="px-3 py-1 text-sm flex flex-row items-center border border-gray-300 dark:border-gray-600 {timePeriod ===
              item
                ? 'bg-gray-300 dark:bg-white text-black '
                : ' bg-gray-100 dark:bg-table text-opacity-[0.6]'}  rounded cursor-pointer"
            >
              {item}
              <svg
                class="ml-1 -mt-w-3.5 h-3.5 inline-block"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                ><path
                  fill="currentColor"
                  d="M17 9V7c0-2.8-2.2-5-5-5S7 4.2 7 7v2c-1.7 0-3 1.3-3 3v7c0 1.7 1.3 3 3 3h10c1.7 0 3-1.3 3-3v-7c0-1.7-1.3-3-3-3M9 7c0-1.7 1.3-3 3-3s3 1.3 3 3v2H9z"
                /></svg
              >
            </a>
          {/if}
        {/each}
      </div>

      <div
        class="shadow-xs border border-gray-300 dark:border-gray-800 rounded"
        use:highcharts={config}
      ></div>
    {/if}
  </div>

  <h3 class="text-xl sm:text-2xl font-bold mt-5">
    {title === "Gamma" ? "GEX" : "DEX"} History
  </h3>

  <div class="mt-3 w-full overflow-x-auto">
    <table
      class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto"
    >
      <thead>
        <TableHeader {columns} {sortOrders} {sortData} />
      </thead>
      <tbody>
        {#each data?.user?.tier === "Pro" ? displayList : displayList?.slice(0, 3) as item, index}
          <tr
            class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd {index +
              1 ===
              displayList?.slice(0, 3)?.length &&
            !['Pro']?.includes(data?.user?.tier)
              ? 'opacity-[0.1]'
              : ''}"
          >
            <td class=" text-sm sm:text-[1rem] text-start whitespace-nowrap">
              {formatDate(item?.date)}
            </td>
            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {title === "Gamma"
                ? item?.call_gex?.toLocaleString("en-US")
                : item?.call_dex?.toLocaleString("en-US")}
            </td>
            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {title === "Gamma"
                ? item?.put_gex?.toLocaleString("en-US")
                : item?.put_dex?.toLocaleString("en-US")}
            </td>

            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {title === "Gamma"
                ? item?.netGex?.toLocaleString("en-US")
                : item?.netDex?.toLocaleString("en-US")}
            </td>

            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {#if item?.putCallRatio <= 1 && item?.putCallRatio !== null}
                <span class="dark:text-[#00FC50]"
                  >{item?.putCallRatio?.toFixed(2)}</span
                >
              {:else if item?.putCallRatio >= 0 && item?.putCallRatio !== null}
                <span class=" dark:text-[#FF2F1F]"
                  >{item?.putCallRatio?.toFixed(2)}</span
                >
              {:else}
                n/a
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <UpgradeToPro {data} display={true} />
</div>
