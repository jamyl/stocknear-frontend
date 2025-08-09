<script lang="ts">
  import { abbreviateNumber } from "$lib/utils";
  import { screenWidth, setCache, getCache } from "$lib/store";

  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import UpgradeToPro from "$lib/components/UpgradeToPro.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  import { onMount } from "svelte";

  export let data;
  export let ticker = null;

  let isLoaded = false;
  let configContract = null;

  let optionHistoryList = [];
  let selectGraphType = "Vol/OI";
  let container;
  let rawDataHistory = [];
  let strikePrice;
  let optionType;
  let dateExpiration;

  const currentTime = new Date(
    new Date().toLocaleString("en-US", { timeZone: "UTC" }),
  )?.getTime();

  let rawData = data?.getData?.map((item) => ({
    ...item,
    dte: daysLeft(item?.expiry),
  }));

  let displayList = rawData?.slice(0, 50) || [];

  let configUnusual = null;

  function daysLeft(targetDate) {
    const targetTime = new Date(targetDate).getTime();
    const difference = targetTime - currentTime;

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math?.ceil(difference / millisecondsPerDay);

    return daysLeft + "D";
  }

  function calculateDTE(data, dateExpiration) {
    // Convert the expiration date to a Date object
    const expirationDate = new Date(dateExpiration);

    return data.map((item) => {
      const itemDate = new Date(item.date); // Convert item.date to a Date object
      const timeDifference = expirationDate - itemDate; // Difference in milliseconds
      const dte = Math.ceil(timeDifference / (1000 * 60 * 60 * 24)); // Convert ms to days

      // Add the calculated DTE to the object
      return {
        ...item,
        dte, // Add DTE as a new property
      };
    });
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
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg">${ticker} Unusual Options Activity with Premium Impact</h3>`,
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
    if (isBottom && displayList?.length !== rawData?.length) {
      const nextIndex = displayList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 50);
      displayList = [...displayList, ...filteredNewResults];
    }
  }
  onMount(async () => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  function plotContractHistory() {
    // Ensure rawDataHistory exists and sort it by date
    const sortedData =
      rawDataHistory?.sort((a, b) => new Date(a?.date) - new Date(b?.date)) ||
      [];

    // Filter out data points that have an undefined price so they don't appear in any series
    const filteredData = sortedData?.filter((item) => item.price !== undefined);

    // Choose a strong contrasting color for the stock price line
    const priceColor =
      $mode === "light"
        ? "#1E3A8A" /* deep indigo */
        : "#3B82F6"; /* bright blue */

    // Build series based on the selected graph type
    let series = [];

    if (selectGraphType === "Vol/OI") {
      series = [
        {
          name: "Stock Price",
          type: "spline",
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.price,
          ]),
          color: priceColor,
          lineWidth: 2,
          marker: { enabled: false },
          animation: false,
        },
        {
          name: "Avg Fill",
          type: "spline",
          yAxis: 2,
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.mark,
          ]),
          color: "#F21C64",
          lineWidth: 1.8,
          marker: { enabled: false },
          animation: false,
        },
        {
          name: "Volume",
          type: "column",
          yAxis: 0,
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.volume,
          ]),
          color: "#FD7E14",
          borderColor: "#FD7E14",
          borderRadius: 2,
          animation: false,
        },
        {
          name: "OI",
          type: "column",
          yAxis: 0,
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.open_interest,
          ]),
          color: "#33B890",
          borderColor: "#33B890",
          borderRadius: 2,
          animation: false,
        },
      ];
    } else {
      series = [
        {
          name: "Stock Price",
          type: "spline",
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.price,
          ]),
          color: priceColor,
          lineWidth: 2,
          marker: { enabled: false },
          animation: false,
        },
        {
          name: "Avg Fill",
          type: "spline",
          yAxis: 2,
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            item.mark,
          ]),
          color: "#F21C64",
          lineWidth: 1.8,
          marker: { enabled: false },
          animation: false,
        },
        {
          name: "IV",
          type: "spline",
          yAxis: 0,
          data: filteredData.map((item) => [
            new Date(item.date).getTime(),
            Math.floor(item.implied_volatility * 100),
          ]),
          color:
            $mode === "light"
              ? "#374151" /* dark gray */
              : "#F9FAFB" /* light gray */,
          lineWidth: 1.8,
          marker: { enabled: false },
          animation: false,
        },
      ];
    }

    // Highcharts configuration object
    const options = {
      chart: {
        backgroundColor: $mode === "light" ? "#FFFFFF" : "#09090B",
        animation: false,
        height: 360,
      },
      credits: { enabled: false },
      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg">Contract History</h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "#111827" : "#F9FAFB" },
      },
      plotOptions: {
        series: {
          animation: false,
          states: { hover: { enabled: false } },
        },
      },
      xAxis: {
        type: "datetime",
        crosshair: {
          color: $mode === "light" ? "#111827" : "#F9FAFB",
          width: 1,
        },
        labels: {
          style: { color: $mode === "light" ? "#4B5563" : "#F9FAFB" },
          formatter() {
            return new Date(this.value).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
          },
        },
        tickPositioner() {
          const positions = [];
          const info = this.getExtremes();
          const tickCount = 5;
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
          gridLineColor: $mode === "light" ? "#E5E7EB" : "#111827",
          labels: {
            style: { color: $mode === "light" ? "#4B5563" : "#F9FAFB" },
          },
          title: { text: null },
          opposite: true,
        },
        { title: { text: null }, gridLineWidth: 0, labels: { enabled: false } },
        { title: { text: null }, gridLineWidth: 0, labels: { enabled: false } },
      ],
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
        style: { color: "#FFF", fontSize: "16px", padding: "10px" },
        borderRadius: 4,
        formatter() {
          let content = `<span class="font-medium text-[1rem]">${new Date(
            this.x,
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}</span><br/>`;

          this.points.forEach((pt) => {
            // Determine suffix: add “%” only for IV series
            const suffix = pt.series.name === "IV" ? "%" : "";
            const value = pt.y?.toLocaleString("en-US") + suffix;

            content += `
        <span
          style="
            display: inline-block;
            width: 10px;
            height: 10px;
            background-color: ${pt.color};
            border-radius: 50%;
            margin-right: 5px;
            vertical-align: middle;
          "
        ></span>
        <span class="font-semibold">${pt.series.name}:</span>
        <span>${value}</span><br/>
      `;
          });

          return content;
        },
      },
      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "top",
        layout: "horizontal",
        itemStyle: { color: $mode === "light" ? "#111827" : "#F9FAFB" },
        symbolWidth: 16,
        symbolRadius: 8,
        squareSymbol: false,
      },
      series,
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

    strikePrice = item?.strike;
    optionType = item?.optionType;
    dateExpiration = item?.expiry;

    const output = await getContractHistory(item?.optionSymbol);
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
      configContract = plotContractHistory();
      rawDataHistory = rawDataHistory?.sort(
        (a, b) => new Date(b?.date) - new Date(a?.date),
      );
      optionHistoryList = rawDataHistory?.slice(0, 20);
    } else {
      configContract = null;
    }

    isLoaded = true;
  }

  $: columns = [
    { key: "date", label: "Date", align: "left" },
    { key: "optionSymbol", label: "Option Chain", align: "right" },
    { key: "dte", label: "DTE", align: "right" },
    { key: "unusualType", label: "Type", align: "right" },
    { key: "executionEst", label: "Exec", align: "right" },
    { key: "sentiment", label: "Sent.", align: "right" },
    { key: "size", label: "Size", align: "right" },
    { key: "price", label: "Spot", align: "right" },
    { key: "premium", label: "Prem", align: "right" },
  ];

  $: sortOrders = {
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
    let originalData = rawData;
    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      displayList = [...originalData]?.slice(0, 150); // Reset originalData to rawData
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

    // Sort using the generic comparison function
    displayList = [...originalData].sort(compareValues)?.slice(0, 150);
  };

  $: {
    if (selectGraphType) {
      isLoaded = false;
      if (rawDataHistory?.length > 0) {
        configContract = plotContractHistory();
      } else {
        configContract = null;
      }

      isLoaded = true;
    }
  }

  $: {
    if ($mode) {
      configUnusual = plotData() || null;
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
            ? ", showing <strong>accelerating institutional interest</strong>"
            : ""
        }.`}
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
                use:highcharts={configUnusual}
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
                    class=" text-sm sm:text-[1rem] text-start whitespace-nowrap"
                  >
                    {formatDate(item?.date)}
                  </td>

                  <td class="text-sm sm:text-[1rem] text-end whitespace-nowrap">
                    <span class="px-2">
                      {item?.optionType}
                      {" " + item?.strike}
                    </span>
                    <label
                      on:click={() => handleViewData(item)}
                      on:mouseover={() =>
                        getContractHistory(item?.option_symbol)}
                      class="cursor-pointer text-blue-800 sm:hover:text-muted dark:text-blue-400 dark:sm:hover:text-white"
                    >
                      {new Date(item.expiry).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="inline-block w-4 h-4 -mt-1"
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
          ${optionHistoryList?.at(0)?.total_premium?.toLocaleString("en-US")}
        </div>
        <div class="mr-3 whitespace-nowrap">
          <span class="text-[var(--light-text-color)] font-normal">IV:</span>
          {(optionHistoryList?.at(0)?.implied_volatility * 100)?.toLocaleString(
            "en-US",
          )}%
        </div>
      </div>

      <div class="pb-8 sm:pb-2 rounded overflow-hidden">
        <div
          class="flex flex-row items-center justify-between gap-x-2 ml-auto w-fit mt-2"
        >
          {#each ["Vol/OI", "IV"] as item}
            <label
              on:click={() => (selectGraphType = item)}
              class="px-3 py-1.5 {selectGraphType === item
                ? 'shadow-xs bg-black text-white  dark:bg-white dark:text-black '
                : 'shadow-xs text-opacity-[0.6] border border-gray-300 dark:border-gray-600'} transition ease-out duration-100 sm:hover:bg-white sm:hover:text-black rounded cursor-pointer"
            >
              {item}
            </label>
          {/each}
        </div>
        <div
          class="mt-2 border border-gray-300 dark:border-gray-800 rounded"
          use:highcharts={configContract}
        ></div>
      </div>

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
                      ${item?.total_premium?.toLocaleString("en-US")}
                    </td>
                    <td class="text-sm sm:text-[1rem] text-end">
                      {item?.gex?.toLocaleString("en-US")}
                    </td>
                    <td class="text-sm sm:text-[1rem] text-end">
                      {item?.dex?.toLocaleString("en-US")}
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
