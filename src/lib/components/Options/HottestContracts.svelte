<script lang="ts">
  import { abbreviateNumber, calculateDTE } from "$lib/utils";
  import { setCache, getCache, screenWidth } from "$lib/store";

  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import UpgradeToPro from "$lib/components/UpgradeToPro.svelte";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  export let data;
  export let ticker;
  export let title;
  export let type;

  let isLoaded = false;
  let config = null;
  let configBarChart = null;

  let optionHistoryList = [];
  let selectGraphType = "Vol/OI";
  let container;
  let rawDataHistory = [];
  let strikePrice;
  let optionType;
  let dateExpiration;
  let otmPercentage;

  let rawData = [];
  let tableData = [];

  function convertDateFormat(dateString) {
    // Check if the input is a valid string
    if (!dateString || typeof dateString !== "string") {
      return null;
    }

    // Split the date string by '-'
    const parts = dateString.split("-");

    // Validate that we have exactly 3 parts
    if (parts.length !== 3) {
      return null;
    }

    const [year, month, day] = parts;

    // Basic validation
    if (!year || !month || !day || year.length !== 4) {
      return null;
    }

    // Return in mm/dd/yyyy format
    return `${month}/${day}/${year?.slice(-2)}`;
  }

  function initialize() {
    selectGraphType = "Vol/OI";
    rawDataHistory = [];
    if (type === "oi") {
      rawData = data?.getData?.openInterest?.map((item) => ({
        ...item,
        dte: daysLeft(item?.date_expiration),
        otm: computeOTM(item?.strike_price, item?.option_type),
      }));
      tableData = rawData;
    } else {
      rawData = data?.getData?.volume?.map((item) => ({
        ...item,
        dte: daysLeft(item?.date_expiration),
        otm: computeOTM(item?.strike_price, item?.option_type),
      }));

      tableData = rawData;
    }
  }
  function formatDate(dateStr) {
    // Convert the input date string to a Date object in New York time
    let date = new Date(dateStr + "T00:00:00Z"); // Assume input is in UTC

    // Convert to New York Time Zone
    let options = {
      timeZone: "UTC",
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    };

    let formatter = new Intl.DateTimeFormat("en-US", options);

    return formatter?.format(date);
  }

  function computeOTM(strikePrice, optionType) {
    // Get the current stock price
    const currentPrice = data?.getStockQuote?.price;

    let otmPercentage = 0;

    if (optionType === "C") {
      // Call option: OTM is positive if strike > currentPrice, negative (ITM) otherwise
      otmPercentage = (
        ((strikePrice - currentPrice) / currentPrice) *
        100
      )?.toFixed(2);
    } else if (optionType === "P") {
      // Put option: OTM is positive if strike < currentPrice, negative (ITM) otherwise
      otmPercentage = (
        ((currentPrice - strikePrice) / currentPrice) *
        100
      )?.toFixed(2);
    } else {
      otmPercentage = "n/a";
    }

    return otmPercentage; // Return the percentage rounded to two decimal places
  }

  function getScroll() {
    const scrollThreshold = container.scrollHeight * 0.8; // 80% of the container height

    // Check if the user has scrolled to the bottom based on the threshold
    const isBottom =
      container.scrollTop + container.clientHeight >= scrollThreshold;

    // Only load more data if at the bottom and there is still data to load
    if (isBottom && optionHistoryList?.length !== rawDataHistory?.length) {
      const nextIndex = optionHistoryList.length; // Ensure optionHistoryList is defined
      const filteredNewResults = rawDataHistory.slice(
        nextIndex,
        nextIndex + 25,
      ); // Ensure rawData is defined
      optionHistoryList = [...optionHistoryList, ...filteredNewResults];
    }
  }

  const currentTime = new Date(
    new Date().toLocaleString("en-US", { timeZone: "UTC" }),
  )?.getTime();

  function daysLeft(targetDate) {
    const targetTime = new Date(targetDate).getTime();
    const difference = targetTime - currentTime;

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math?.ceil(difference / millisecondsPerDay);

    return daysLeft + "D";
  }

  $: columns = [
    { key: "strike_price", label: "Option Chain", align: "left" },
    { key: "dte", label: "DTE", align: "right" },
    { key: "otm", label: "% OTM", align: "right" },
    { key: "last", label: "Last", align: "right" },
    { key: "high", label: "Low-High", align: "right" },
    { key: "volume", label: "Volume", align: "right" },
    { key: "open_interest", label: "OI", align: "right" },
    { key: "open_interest_change", label: "OI Change", align: "right" },
    { key: "iv", label: "IV", align: "right" },
    { key: "total_premium", label: "Total Prem", align: "right" },
  ];

  $: sortOrders = {
    strike_price: { order: "none", type: "number" },
    dte: { order: "none", type: "number" },
    otm: { order: "none", type: "number" },
    last: { order: "none", type: "number" },
    high: { order: "none", type: "number" },
    volume: { order: "none", type: "number" },
    open_interest: { order: "none", type: "number" },
    open_interest_change: { order: "none", type: "number" },
    iv: { order: "none", type: "number" },
    total_premium: { order: "none", type: "number" },
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
      originalData = [...rawData]; // Reset originalData to rawData
      tableData = originalData;
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
    tableData = [...originalData].sort(compareValues);
  };

  function plotBarChart() {
    // Transform raw data
    let sortedData = [];
    if (type === "oi") {
      sortedData = [...rawData]?.sort(
        (a, b) => b?.open_interest - a?.open_interest,
      );
    } else {
      sortedData = [...rawData]?.sort((a, b) => b?.volume - a?.volume);
    }

    const categories = sortedData?.map(
      (item) =>
        `${convertDateFormat(item.date_expiration)} ${item.strike_price}${item.option_type}`,
    );
    const data = sortedData.map((item) => ({
      y: type === "oi" ? item.open_interest : item.volume,
      color: item.option_type === "P" ? "#f87171" : "#34d399", // red for Puts, greenish for Calls
      // Store the original data for tooltip access
      originalData: item,
    }));

    const options = {
      credits: {
        enabled: false,
      },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        type: "bar",
        height: 360,
        animation: false,
      },
      title: { text: null },
      xAxis: {
        categories,
        title: null,
        labels: {
          style: {
            color: $mode === "light" ? "#09090B" : "white",
            fontSize: "12px",
            fontWeight: "400",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis", // optional: add ... if it overflows
            overflow: "hidden", // optional: hide overflow
          },
          useHTML: true,
          formatter: function () {
            return this.value; // no <br>, just the original string
          },
        },

        lineWidth: 0,
        tickLength: 0,
      },
      yAxis: {
        min: 0,
        title: null,
        labels: {
          style: { color: $mode === "light" ? "#545454" : "white" },
        },
        gridLineWidth: 0,
        lineWidth: 0,
        tickLength: 0,
      },
      plotOptions: {
        series: {
          pointWidth: 10, // fixed bar width
        },
        bar: {
          dataLabels: {
            enabled: true,
            inside: false,
            align: "right",
            style: {
              color: "#000",
              fontSize: "12.5px",
              fontWeight: "550",
              textOutline: "none",
            },
            formatter: function () {
              return this.y?.toLocaleString("en-US");
            },
          },
          borderWidth: 0,
          pointPadding: $screenWidth < 640 ? 0.02 : 0.18, // Much smaller padding on mobile for thicker bars
          groupPadding: $screenWidth < 640 ? 0.4 : -0.1,
          animation: false,
          states: {
            hover: { enabled: false },
            inactive: { enabled: false },
          },
        },
      },
      tooltip: {
        shared: false, // Changed to false since we're dealing with single series
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
          // Access the original data from the point
          const originalItem = this.point.originalData;

          let tooltipContent = `<span class="m-auto text-xs">${ticker} ${convertDateFormat(originalItem?.date_expiration)} ${originalItem.strike_price}${originalItem.option_type}</span><br>`;
          tooltipContent += `<span class="font-normal text-sm">OI: ${this.y?.toLocaleString("en-US")}</span><br>`;

          return tooltipContent;
        },
      },
      series: [
        {
          name: "Open Interest",
          data,
          animation: false,
        },
      ],
      legend: { enabled: false },
    };
    return options;
  }
  function plotContractHistory() {
    // Ensure rawDataHistory exists and sort it by date
    const sortedData =
      rawDataHistory?.sort((a, b) => new Date(a?.date) - new Date(b?.date)) ||
      [];

    // Filter out data points that have an undefined price so they don't appear in any series
    const filteredData = sortedData.filter((item) => item?.price !== undefined);

    // Build series based on the selected graph type, using filteredData
    let series = [];
    const fillColorStart = "rgb(70, 129, 244,0.5)";
    const fillColorEnd = "rgb(70, 129, 244,0.001)";

    if (selectGraphType == "Vol/OI") {
      series = [
        {
          name: "Stock Price",
          type: "area",
          yAxis: 1,
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.price,
          ]),
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, fillColorStart],
              [1, fillColorEnd],
            ],
          },
          color: "#4681f4",
          borderColor: "4681f4",
          lineWidth: 1.3,
          marker: { enabled: false },
          animation: false,
        },
        {
          name: "Avg Fill",
          type: "spline", // smooth line
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.mark,
          ]),
          color: "#F21C64",
          yAxis: 2,
          lineWidth: 1.3,
          animation: false,
          marker: { enabled: false },
        },
        {
          name: "Volume",
          type: "column",
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.volume,
          ]),
          color: "#FD7E14",
          borderColor: "#FD7E14",
          borderRadius: "2px",
          yAxis: 0,
          animation: false,
        },
        {
          name: "OI",
          type: "column",
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.open_interest,
          ]),
          color: "#33B890",
          borderColor: "#33B890",
          borderRadius: "2px",
          yAxis: 0,
          animation: false,
        },
      ];
    } else {
      series = [
        {
          name: "Stock Price",
          type: "area",
          yAxis: 1,
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.price,
          ]),
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, fillColorStart],
              [1, fillColorEnd],
            ],
          },
          color: "#4681f4",
          borderColor: "4681f4",
          lineWidth: 1.3,
          marker: { enabled: false },
          animation: false,
        },
        {
          name: "Avg Fill",
          type: "spline", // smooth line
          data: filteredData?.map((item) => [
            new Date(item.date).getTime(),
            item.mark,
          ]),
          color: "#F21C64",
          yAxis: 2,
          lineWidth: 1.3,
          animation: false,
          marker: { enabled: false },
        },
        {
          name: "IV",
          type: "spline",
          data: filteredData?.map((item) => [
            new Date(item.date).getTime(),
            Math.floor(item.implied_volatility * 100),
          ]),
          color: $mode === "light" ? "black" : "white",
          yAxis: 0,
          animation: false,
          marker: { enabled: false },
        },
      ];
    }

    // Highcharts configuration object
    const options = {
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        animation: false,
        height: 360,
      },
      credits: { enabled: false },
      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg">Contract History</h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "black" : "white" },
      },
      // Disable markers globally on hover for all series
      plotOptions: {
        series: {
          color: $mode === "light" ? "black" : "white",
          animation: false, // Disable series animation
          states: {
            hover: {
              enabled: false, // Disable hover effect globally
            },
          },
        },
      },
      xAxis: {
        type: "datetime",
        endOnTick: false,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: { color: $mode === "light" ? "#545454" : "white" },
          distance: 20,
          formatter: function () {
            return new Date(this.value).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
          },
        },
        tickPositioner: function () {
          const positions = [];
          const info = this.getExtremes();
          const tickCount = 5; // Reduce number of ticks displayed
          const interval = Math.floor((info.max - info.min) / tickCount);

          for (let i = 0; i <= tickCount; i++) {
            positions.push(info.min + i * interval);
          }
          return positions;
        },
      },
      yAxis: [
        {
          gridLineWidth: 1,
          gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
          labels: {
            style: { color: $mode === "light" ? "#545454" : "white" },
          },
          title: { text: null },
          opposite: true,
        },
        {
          title: { text: null },
          gridLineWidth: 0,
          labels: { enabled: false },
        },
        {
          title: { text: null },
          gridLineWidth: 0,
          labels: { enabled: false },
        },
        {
          title: { text: null },
          gridLineWidth: 0,
          labels: { enabled: false },
        },
      ],
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
          })}</span><br>`;

          // Loop through each point in the shared tooltip
          this.points.forEach((point) => {
            tooltipContent += `
        <span class="font-semibold text-sm">${point.series.name}:</span> 
        <span class="font-normal text-sm">${abbreviateNumber(point.y)}</span><br>`;
          });

          return tooltipContent;
        },
      },

      legend: {
        enabled: true,
        align: "center", // Positions legend at the left edge
        verticalAlign: "top", // Positions legend at the top
        layout: "horizontal", // Align items horizontally (use 'vertical' if preferred)
        itemStyle: {
          color: $mode === "light" ? "black" : "white",
        },
        symbolWidth: 14, // Controls the width of the legend symbol
        symbolRadius: 1, // Creates circular symbols (adjust radius as needed)
        squareSymbol: true, // Ensures symbols are circular, not square
      },
      series: series,
    };

    return options;
  }

  const getContractHistory = async (contractId) => {
    let output;
    const cachedData = getCache(contractId, "getContractHistory");
    if (cachedData) {
      output = cachedData;
    } else {
      const postData = {
        ticker: ticker,
        contract: contractId,
      };

      // make the POST request to the endpoint
      const response = await fetch("/api/options-contract-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      output = await response.json();

      setCache(contractId, output, "getContractHistory");
    }

    return output;
  };

  async function handleViewData(item) {
    isLoaded = false;
    selectGraphType = "Vol/OI";
    optionDetailsDesktopModal?.showModal();

    strikePrice = item?.strike_price;
    optionType = item?.option_type;
    dateExpiration = item?.date_expiration;
    otmPercentage = item?.otm;

    const output = await getContractHistory(item?.option_symbol);
    rawDataHistory = output?.history;

    if (rawDataHistory?.length > 0) {
      rawDataHistory.forEach((entry) => {
        const matchingData = data?.getHistoricalPrice?.find(
          (d) => d?.time === entry?.date,
        );
        if (matchingData) {
          entry.price = matchingData?.close;
        }
      });

      rawDataHistory = calculateDTE(rawDataHistory, dateExpiration);
      config = plotContractHistory();
      rawDataHistory = rawDataHistory?.sort(
        (a, b) => new Date(b?.date) - new Date(a?.date),
      );
      optionHistoryList = rawDataHistory?.slice(0, 20);
    } else {
      config = null;
    }

    isLoaded = true;
  }

  $: {
    if (selectGraphType && isLoaded) {
      if (rawDataHistory?.length > 0) {
        config = plotContractHistory();
      } else {
        config = null;
      }
    }
  }

  $: {
    if (ticker && typeof window !== "undefined") {
      isLoaded = false;

      initialize();
      configBarChart = plotBarChart() || null;
      isLoaded = true;
    }
  }
</script>

<section class="w-full overflow-hidden">
  <div class="w-full flex h-full overflow-hidden">
    <div
      class="w-full relative flex justify-center items-center overflow-hidden"
    >
      <div class="sm:pl-7 sm:pb-7 sm:pt-7 w-full m-auto mt-2 sm:mt-0">
        <h2
          class=" flex flex-row items-center text-xl sm:text-2xl font-bold w-fit"
        >
          {ticker}
          {title}
        </h2>

        <p class="mt-4">
          The highest {type === "oi" ? "open interest" : "volume"} is
          <strong
            >{type === "oi"
              ? Math.max(
                  ...rawData?.map((item) => item?.open_interest || 0),
                )?.toLocaleString("en-US")
              : Math.max(
                  ...rawData?.map((item) => item?.volume || 0),
                )?.toLocaleString("en-US")}</strong
          >
          contracts at the
          <strong
            >{type === "oi"
              ? rawData?.find(
                  (item) =>
                    item?.open_interest ===
                    Math.max(...rawData?.map((i) => i?.open_interest || 0)),
                )?.strike_price
              : rawData?.find(
                  (item) =>
                    item?.volume ===
                    Math.max(...rawData?.map((i) => i?.volume || 0)),
                )?.strike_price}</strong
          >
          {type === "oi"
            ? rawData?.find(
                (item) =>
                  item?.open_interest ===
                  Math.max(...rawData?.map((i) => i?.open_interest || 0)),
              )?.option_type === "C"
              ? "call"
              : "put"
            : rawData?.find(
                  (item) =>
                    item?.volume ===
                    Math.max(...rawData?.map((i) => i?.volume || 0)),
                )?.option_type === "C"
              ? "call"
              : "put"}
          strike. The average implied volatility across all contracts is
          <strong
            >{(
              rawData
                ?.filter((item) => item?.iv)
                ?.reduce((sum, item, _, arr) => sum + parseFloat(item.iv), 0) /
                rawData?.filter((item) => item?.iv)?.length || 0
            )?.toFixed(2)}%</strong
          >.
        </p>

        {#if configBarChart}
          <div
            class=" sm:p-3 shadow-xs border border-gray-300 dark:border-gray-800 rounded mt-4 mb-4"
            use:highcharts={configBarChart}
          ></div>
        {/if}

        <div class="w-full overflow-x-auto">
          <table
            class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
          >
            <thead>
              <TableHeader {columns} {sortOrders} {sortData} />
            </thead>
            <tbody>
              {#each data?.user?.tier === "Pro" ? tableData : tableData?.slice(0, 3) as item, index}
                <tr
                  class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd {index +
                    1 ===
                    tableData?.slice(0, 3)?.length &&
                  !['Pro']?.includes(data?.user?.tier)
                    ? 'opacity-[0.1]'
                    : ''}"
                >
                  <td
                    class=" text-sm sm:text-[1rem] text-start whitespace-nowrap flex flex-row items-center justify-between"
                  >
                    <span
                      class={item?.option_type === "C"
                        ? "dark:text-[#00FC50]"
                        : "dark:text-[#FF2F1F]"}
                    >
                      {item?.option_type === "C" ? "Call" : "Put"}
                      {" " + item?.strike_price}
                    </span>
                    <label
                      on:click={() => handleViewData(item)}
                      on:mouseover={() =>
                        getContractHistory(item?.option_symbol)}
                      class="cursor-pointer text-blue-800 sm:hover:text-muted dark:text-blue-400 dark:sm:hover:text-white sm:hover:underline sm:hover:underline-offset-4"
                    >
                      {" " +
                        new Date(item.date_expiration).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          },
                        )}

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="inline-block w-4 h-4"
                        viewBox="0 0 512 512"
                        fill="currentColor"
                        ><path
                          d="M104 496H72a24 24 0 01-24-24V328a24 24 0 0124-24h32a24 24 0 0124 24v144a24 24 0 01-24 24zM328 496h-32a24 24 0 01-24-24V232a24 24 0 0124-24h32a24 24 0 0124 24v240a24 24 0 01-24 24zM440 496h-32a24 24 0 01-24-24V120a24 24 0 0124-24h32a24 24 0 0124 24v352a24 24 0 01-24 24zM216 496h-32a24 24 0 01-24-24V40a24 24 0 0124-24h32a24 24 0 0124 24v432a24 24 0 01-24 24z"
                        ></path></svg
                      >
                    </label>
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.dte}
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.otm}%
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.last ?? "n/a"}
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {#if item?.low && item?.high}
                      {item?.low}-{item?.high}
                    {:else}
                      n/a
                    {/if}
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.volume?.toLocaleString("en-US")}
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {item?.open_interest?.toLocaleString("en-US")}
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    {#if item?.changeOI >= 0}
                      <span class="text-green-800 dark:text-[#00FC50]"
                        >+{item?.changeOI?.toLocaleString("en-US")}</span
                      >
                    {:else if item?.changeOI < 0}
                      <span class="text-red-800 dark:text-[#FF2F1F]"
                        >{item?.changeOI?.toLocaleString("en-US")}</span
                      >
                    {:else}
                      n/a
                    {/if}
                  </td>
                  <td class="text-sm sm:text-[1rem] text-end">
                    {item?.iv ? item?.iv + "%" : "n/a"}
                  </td>
                  <td
                    class=" text-sm sm:text-[1rem] text-end whitespace-nowrap"
                  >
                    ${item?.total_premium?.toLocaleString("en-US")}
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

<dialog
  id="optionDetailsDesktopModal"
  class="modal {$screenWidth < 640 ? 'modal-bottom ' : ''} bg-[#000]/40 sm:px-5"
>
  <div
    class="modal-box bg-white dark:bg-default w-full {rawDataHistory?.length > 0
      ? 'max-w-7xl'
      : 'w-full'} rounded border-t sm:border border-gray-300 dark:border-gray-800 min-h-48 h-auto"
  >
    <form
      method="dialog"
      class="modal-backdrop backdrop-blur-[4px] flex flex-row items-center w-full justify-between"
    >
      <p
        class="text-muted dark:text-white text-[1rem] sm:text-xl font-semibold cursor-text"
      >
        Contract: <span
          class={optionType === "Calls"
            ? "text-green-800 dark:text-[#00FC50]"
            : "text-red-800 dark:text-[#FF2F1F]"}
          >{ticker}
          {strikePrice}
          {optionType}
          {dateExpiration} ({daysLeft(dateExpiration)})
        </span>
      </p>
      <button class="cursor-pointer text-[1.8rem] focus:outline-hidden">
        <svg
          class="w-8 h-8 text-muted dark:text-white"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          ><path
            fill="currentColor"
            d="m6.4 18.308l-.708-.708l5.6-5.6l-5.6-5.6l.708-.708l5.6 5.6l5.6-5.6l.708.708l-5.6 5.6l5.6 5.6l-.708.708l-5.6-5.6z"
          />
        </svg>
      </button>
    </form>
    {#if rawDataHistory?.length > 0}
      <div
        class="border-b border-gray-300 dark:border-gray-800 w-full mt-2 mb-2 sm:mb-3 sm:mt-3"
      ></div>

      <div class="hidden sm:flex flex-wrap pb-2">
        <div class="mr-3 whitespace-nowrap">
          {formatDate(optionHistoryList?.at(0)?.date)}:
        </div>
        <div class="mr-3 whitespace-nowrap">
          <span class="text-[var(--light-text-color)] font-normal">Vol:</span>
          {optionHistoryList?.at(0)?.volume?.toLocaleString("en-US")}
        </div>
        <div class="mr-3 whitespace-nowrap">
          <span class="text-[var(--light-text-color)] font-normal">OI:</span>
          {optionHistoryList?.at(0)?.open_interest?.toLocaleString("en-US")}
        </div>
        <div class="mr-3 whitespace-nowrap">
          <span class="text-[var(--light-text-color)] font-normal">Avg:</span>
          ${optionHistoryList?.at(0)?.mark}
        </div>
        <div class="mr-3 whitespace-nowrap">
          <span class="text-[var(--light-text-color)] font-normal">Prem:</span>
          {abbreviateNumber(optionHistoryList?.at(0)?.total_premium, true)}
        </div>
        <div class="mr-3 whitespace-nowrap">
          <span class="text-[var(--light-text-color)] font-normal">IV:</span>
          {(optionHistoryList?.at(0)?.implied_volatility * 100)?.toLocaleString(
            "en-US",
          )}%
        </div>
      </div>

      <div class="pb-5 sm:pb-2 rounded overflow-hidden">
        <div
          class="flex flex-row items-center justify-between gap-x-2 ml-auto w-fit mt-2"
        >
          {#each ["Vol/OI", "IV"] as item}
            <label
              on:click={() => (selectGraphType = item)}
              class="px-3 py-1.5 {selectGraphType === item
                ? 'shadow-xs bg-black dark:bg-white text-white dark:text-black '
                : 'shadow text-opacity-[0.6] border border-gray-300 dark:border-gray-600'} rounded cursor-pointer"
            >
              {item}
            </label>
          {/each}
        </div>
        <div
          class="mt-2 border border-gray-300 dark:border-gray-800 rounded"
          use:highcharts={config}
        ></div>
      </div>

      <h3 class="text-xl sm:text-2xl font-bold">Contract History</h3>

      <div
        bind:this={container}
        on:scroll={getScroll}
        class="h-full max-h-[500px] overflow-y-auto overflow-x-auto"
      >
        <div class="flex justify-start items-center m-auto cursor-normal">
          {#if isLoaded}
            <table
              class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
            >
              <thead class="text-white bg-default">
                <tr class="">
                  <td class=" font-semibold text-sm text-start">Date</td>
                  <td class=" font-semibold text-sm text-end">Vol</td>
                  <td class=" font-semibold text-sm text-end">OI</td>
                  <td class=" font-semibold text-sm text-end">OI Change</td>
                  <td class=" font-semibold text-sm text-end">% Change OI</td>
                  <td class=" font-semibold text-sm text-end">Last Price</td>
                  <td class=" font-semibold text-sm text-end">Avg Price</td>
                  <td class=" font-semibold text-sm text-end">IV</td>
                  <td class=" font-semibold text-sm text-end">Total Prem</td>
                  <td class=" font-semibold text-sm text-end">GEX</td>
                  <td class=" font-semibold text-sm text-end">DEX</td>
                </tr>
              </thead>
              <tbody>
                {#each optionHistoryList as item}
                  <!-- row -->
                  <tr
                    class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                  >
                    <td class="text-sm sm:text-[1rem] text-start">
                      {formatDate(item?.date)}
                    </td>

                    <td class="text-sm sm:text-[1rem] text-end">
                      {item?.volume !== null
                        ? item?.volume?.toLocaleString("en-US")
                        : 0}
                    </td>

                    <td class="text-sm sm:text-[1rem] text-end">
                      {item?.open_interest !== undefined
                        ? item?.open_interest?.toLocaleString("en-US")
                        : "n/a"}
                    </td>
                    <td class="text-sm sm:text-[1rem] text-end">
                      {#if item?.changeOI >= 0 && item?.changeOI !== null}
                        <span class="text-green-800 dark:text-[#00FC50]"
                          >+{item?.changeOI?.toLocaleString("en-US")}</span
                        >
                      {:else if item?.changeOI < 0 && item?.changeOI !== null}
                        <span class="text-red-800 dark:text-[#FF2F1F]"
                          >{item?.changeOI?.toLocaleString("en-US")}</span
                        >
                      {:else}
                        n/a
                      {/if}
                    </td>

                    <td class="text-sm sm:text-[1rem] text-end">
                      {#if item?.changesPercentageOI > 0 && item?.changesPercentageOI !== undefined}
                        <span class="text-green-800 dark:text-[#00FC50]"
                          >+{item?.changesPercentageOI + "%"}</span
                        >
                      {:else if item?.changesPercentageOI < 0 && item?.changesPercentageOI !== undefined}
                        <span class="text-red-800 dark:text-[#FF2F1F]"
                          >{item?.changesPercentageOI + "%"}</span
                        >
                      {:else if item?.changesPercentageOI === 0 && item?.changesPercentageOI !== undefined}
                        0%
                      {:else}
                        n/a
                      {/if}
                    </td>

                    <td class="text-sm sm:text-[1rem] text-end">
                      {item?.close}
                    </td>

                    <td class="text-sm sm:text-[1rem] text-end">
                      {item?.mark}
                    </td>

                    <td class="text-sm sm:text-[1rem] text-end">
                      {(item?.implied_volatility * 100)?.toLocaleString(
                        "en-US",
                      ) + "%"}
                    </td>

                    <td class="text-sm sm:text-[1rem] text-end">
                      {abbreviateNumber(item?.total_premium, false, true)}
                    </td>
                    <td class="text-sm sm:text-[1rem] text-end">
                      {abbreviateNumber(item?.gex, false, true)}
                    </td>
                    <td class="text-sm sm:text-[1rem] text-end">
                      {abbreviateNumber(item?.dex, false, true)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <div class="m-auto flex justify-center items-center h-80">
              <div class="relative">
                <label
                  class="shadow-xs bg-default dark:bg-secondary rounded h-14 w-14 flex justify-center items-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                >
                  <span
                    class="loading loading-spinner loading-md text-white dark:text-white"
                  ></span>
                </label>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div
        class="mt-10 flex justify-center sm:justify-start items-center w-full"
      >
        No historical data available yet for the given contract
      </div>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
