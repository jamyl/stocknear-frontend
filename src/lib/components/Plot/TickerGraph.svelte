<script lang="ts">
  import { abbreviateNumber, removeCompanyStrings } from "$lib/utils";
  import { mode } from "mode-watcher";
  import { getCache, setCache } from "$lib/store";
  import highcharts from "$lib/highcharts.ts";
  import { onMount, tick } from "svelte";

  export let tickerList = [];
  export let sources = [];

  $: displayTickerList = tickerList?.slice(0, 10) ?? [];

  // Create a map of ticker to URL from sources
  $: tickerUrlMap =
    sources?.reduce((acc, source) => {
      if (source?.ticker && source?.url) {
        acc[source.ticker] = source.url;
      }
      return acc;
    }, {}) || {};

  let selectedPlotPeriod = "1D";
  let config = null;
  let isLoaded = false;
  let isLoading = false;
  let rawGraphData = {};
  let stockQuotes = {};
  let priceData = {};

  function convertTimestamp(unixSeconds: number | string): string {
    if (!unixSeconds) return "";

    const date = new Date(Number(unixSeconds) * 1000); // convert seconds → ms

    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    return `${formatted} ET`; // explicitly mark Eastern Time
  }

  async function fetchPlotData(tickerList, timePeriod = "one-year") {
    const cacheKey = `plotData-${tickerList.join(",")}-${timePeriod}`;
    const cachedData = getCache(cacheKey, "tickerGraph");
    if (cachedData) {
      console.log("Using cached plot data for:", tickerList, timePeriod);
      return cachedData;
    }

    try {
      const response = await fetch("/api/chat-plot-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tickerList, timePeriod }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCache(cacheKey, "tickerGraph", data);
      return data;
    } catch (error) {
      console.error(`Error fetching plot data:`, error);
      return [];
    }
  }

  async function loadInitialData() {
    if (!displayTickerList || displayTickerList.length === 0) return;
    if (isLoading) return; // Prevent duplicate loading

    isLoading = true;
    isLoaded = false;

    const allTickersCached = displayTickerList.every((ticker) => {
      const quoteCacheKey = `quote-${ticker}`;
      const priceCacheKey = `plotData-${ticker}-one-day`;
      return (
        getCache(quoteCacheKey, "stockQuote") &&
        getCache(priceCacheKey, "tickerGraph")
      );
    });

    if (allTickersCached) {
      displayTickerList.forEach((ticker) => {
        const quoteCacheKey = `quote-${ticker}`;
        const priceCacheKey = `plotData-${ticker}-one-day`;

        stockQuotes[ticker] = getCache(quoteCacheKey, "stockQuote");
        priceData[ticker] = {
          "1D": getCache(priceCacheKey, "tickerGraph") || [],
          "5D": [],
          "1M": [],
          "6M": [],
          YTD: [],
          "1Y": [],
          "5Y": [],
          MAX: [],
        };
      });

      updatePlotData();
      isLoaded = true;
      isLoading = false;
      return;
    }

    // Fetch initial data for 1D period
    const results = await fetchPlotData(displayTickerList, "one-day");

    if (results && results.length > 0) {
      results.forEach((result) => {
        const { ticker, quote, priceData: prices } = result;

        stockQuotes[ticker] = quote;
        setCache(`quote-${ticker}`, "stockQuote", quote);
        setCache(`plotData-${ticker}-one-day`, "tickerGraph", prices || []);

        priceData[ticker] = {
          "1D": prices || [],
          "5D": [],
          "1M": [],
          "6M": [],
          YTD: [],
          "1Y": [],
          "5Y": [],
          MAX: [],
        };
      });

      updatePlotData();
    }

    isLoaded = true;
    isLoading = false;
  }
  /*
  async function changePlotPeriod(timePeriod) {
    isLoaded = false;
    selectedPlotPeriod = timePeriod;

    const periodMapping = {
      "1D": "one-day",
      "5D": "one-week",
      "1M": "one-month",
      "6M": "six-months",
      YTD: "ytd",
      "1Y": "one-year",
      "5Y": "five-years",
      MAX: "max",
    };

    const apiPeriod = periodMapping[timePeriod];
    const allTickersCachedForPeriod = displayTickerList.every((ticker) => {
      const cacheKey = `plotData-${ticker}-${apiPeriod}`;
      return getCache(cacheKey, "tickerGraph");
    });

    if (allTickersCachedForPeriod) {
      tickerList.forEach((ticker) => {
        const cacheKey = `plotData-${ticker}-${apiPeriod}`;
        const cachedPriceData = getCache(cacheKey, "tickerGraph");

        if (priceData[ticker]) {
          priceData[ticker][timePeriod] = cachedPriceData || [];
        }
      });

      updatePlotData();
      isLoaded = true;
      return;
    }

    const needsFetch = tickerList.some(
      (ticker) =>
        !priceData[ticker] ||
        !priceData[ticker][timePeriod] ||
        priceData[ticker][timePeriod].length === 0,
    );

    if (needsFetch && apiPeriod) {
      const results = await fetchPlotData(tickerList, apiPeriod);

      if (results && results.length > 0) {
        results.forEach((result) => {
          const { ticker, priceData: prices } = result;

          setCache(
            `plotData-${ticker}-${apiPeriod}`,
            "tickerGraph",
            prices || [],
          );

          if (priceData[ticker]) {
            priceData[ticker][timePeriod] = prices || [];
          }
        });
      }
    }

    updatePlotData();
    isLoaded = true;
  }
*/
  function updatePlotData() {
    rawGraphData = {};

    displayTickerList.forEach((ticker) => {
      const data = priceData[ticker]?.[selectedPlotPeriod] || [];
      rawGraphData[ticker] = {
        history: data.map((item) => ({
          date: item.time || item.date,
          value: item.close || item.value,
        })),
      };
    });

    config = plotData() || null;
  }

  function plotData() {
    const parsedData: Record<string, [number, number][]> = {};
    const series: any[] = [];

    // Define colors for tickers - optimized for light/dark mode
    const tickerColors = {
      0: $mode === "light" ? "#0066CC" : "#00d4ff", // Blue/Cyan for first ticker
      1: $mode === "light" ? "#FF6B00" : "#ffa500", // Dark Orange/Orange for second ticker
      2: $mode === "light" ? "#00A651" : "#00ff88", // Green for third ticker
    };

    // Process data and calculate percentage changes
    for (const [symbol, data] of Object.entries(rawGraphData)) {
      const seriesData = Array.isArray(data?.history) ? data?.history : [];

      parsedData[symbol] = seriesData?.map((item) => {
        const d = new Date(item?.date);
        return [
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            d.getUTCHours(),
            d.getUTCMinutes(),
            d.getUTCSeconds(),
          ),
          item?.value,
        ];
      });
    }

    // Track min/max percentage values for yAxis scaling
    let minPercentage = 0;
    let maxPercentage = 0;

    // Convert to percentage-based data
    Object.entries(parsedData).forEach(([symbol, dataPoints], index) => {
      if (!dataPoints?.length) return;

      const firstValue = dataPoints[0][1];
      const percentageData = dataPoints.map((point) => {
        const percentValue = (point[1] / firstValue - 1) * 100;
        // Update min/max tracking
        minPercentage = Math.min(minPercentage, percentValue);
        maxPercentage = Math.max(maxPercentage, percentValue);
        return [point[0], percentValue];
      });

      series.push({
        name: symbol,
        type: "line",
        data: percentageData,
        color: tickerColors[index],
        lineWidth: 2,
        marker: { enabled: false },
        zIndex: 2,
      });

      // Add baseline at 0%
      if (index === 0) {
        const firstTime = dataPoints[0][0];
        const lastTime = dataPoints[dataPoints.length - 1][0];
        series.push({
          name: "Baseline",
          type: "line",
          data: [
            [firstTime, 0],
            [lastTime, 0],
          ],
          color: $mode === "light" ? "#9CA3AF" : "#4B5563",
          lineWidth: 1,
          dashStyle: "Solid",
          marker: { enabled: false },
          showInLegend: false,
          enableMouseTracking: false,
          zIndex: 1,
        });
      }
    });

    // Calculate yMin and yMax with padding (similar to document 2)
    // For percentage data, we'll use a slightly different approach
    const padding = 0.1; // 10% padding for percentage values
    const range = maxPercentage - minPercentage;

    // If range is very small, add minimum padding
    const minRange = 1; // Minimum 1% range
    const effectiveRange = Math.max(range, minRange);

    let yMin = minPercentage - effectiveRange * padding;
    let yMax = maxPercentage + effectiveRange * padding;

    // Ensure we always include 0 in the range for percentage charts
    yMin = Math.min(yMin, -0.5);
    yMax = Math.max(yMax, 0.5);

    const baseDate = new Date(
      Object.values(parsedData)?.[0]?.[0]?.[0] || new Date(),
    );
    const startTime = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      9,
      30,
    ).getTime();
    const endTime = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      16,
      0,
    ).getTime();

    return {
      chart: {
        backgroundColor: $mode === "light" ? "#ffffff" : "#09090B",
        animation: false,
        height: 200,
      },
      credits: { enabled: false },
      title: { text: null },

      legend: {
        enabled: false,
      },

      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor:
          $mode === "light" ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.9)",
        borderColor:
          $mode === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.1)",
        borderWidth: 1,
        style: {
          color: $mode === "light" ? "#1f2937" : "white",
          fontSize: "14px",
        },
        borderRadius: 4,
        formatter: function () {
          const date = new Date(this.x);
          const formattedTime = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          let content = `<div style="padding: 8px;">`;
          this.points?.forEach((point) => {
            if (!point.series.name.includes("Baseline")) {
              content += `<div style="color: ${point.series.color}; margin-bottom: 4px;">${point.series.name}: ${point.y >= 0 ? "+" : ""}${point.y?.toFixed(2)}%</div>`;
            }
          });
          content += `<div style="color: ${$mode === "light" ? "#6b7280" : "#fff"}; font-size: 12px; margin-top: 4px;">${formattedTime}</div></div>`;
          return content;
        },
      },

      xAxis: {
        type: "datetime",
        min: selectedPlotPeriod === "1D" ? startTime : null,
        max: selectedPlotPeriod === "1D" ? endTime : null,
        tickLength: 0,
        categories: null,
        crosshair: {
          color: $mode === "light" ? "#374151" : "#e5e7eb",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: {
            color: $mode === "light" ? "#374151" : "#e5e7eb",
            fontSize: "12px",
            fontFamily: "monospace",
          },
          formatter: function () {
            const date = new Date(this.value);
            if (selectedPlotPeriod === "1D") {
              return date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
            } else {
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }
          },
        },
      },

      yAxis: {
        // Force y-axis to stay near the actual data range
        min: yMin ?? null,
        max: yMax ?? null,
        startOnTick: false,
        endOnTick: false,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#1f2937",
        gridLineWidth: 1,
        title: { text: null },
        opposite: true,
        labels: {
          style: {
            color: $mode === "light" ? "#374151" : "#e5e7eb",
            fontSize: "12px",
            fontFamily: "monospace",
          },
          formatter: function () {
            return (
              (this.value >= 0 ? "" : "") + this.value.toFixed(1) + " " + "%"
            );
          },
        },
      },

      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
          states: { hover: { enabled: false } },
        },
      },
      series,
    };
  }

  // Keep track of last loaded ticker list to prevent unnecessary reloads
  let lastTickerList = "";

  // Combined reactive statement for both ticker list and sources changes
  $: {
    const currentTickerKey = displayTickerList.join(",");
    const shouldLoad =
      displayTickerList &&
      displayTickerList.length > 0 &&
      typeof window !== "undefined" &&
      currentTickerKey !== lastTickerList;

    if (shouldLoad) {
      lastTickerList = currentTickerKey;
      tick().then(() => {
        loadInitialData();
      });
    }
  }

  // React to sources changes to ensure proper rendering
  $: if (
    sources &&
    sources.length > 0 &&
    displayTickerList.length > 0 &&
    Object.keys(stockQuotes).length > 0
  ) {
    tick().then(() => {
      updatePlotData();
    });
  }
</script>

{#if tickerList?.length > 0}
  <div class="w-full border-t border-gray-400 dark:border-gray-600 pt-10">
    <div
      class="border border-gray-300 dark:border-gray-800 bg-white dark:bg-default rounded p-6"
    >
      <!-- Header -->

      <div class="flex items-center gap-2 mb-6">
        <div class="ml-auto text-xs">
          {#if displayTickerList?.length > 0}
            {@const firstTicker = displayTickerList[0]}
            {@const firstQuote = stockQuotes[firstTicker]}
            {#if firstQuote}
              Updated {convertTimestamp(firstQuote?.timestamp)}
            {/if}
          {/if}
        </div>
      </div>

      {#if config && isLoaded && Object.keys(stockQuotes)?.length > 0}
        <!-- Stock Price Headers - Side by Side -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
          {#each displayTickerList as ticker, index}
            {@const quote = stockQuotes[ticker]}
            {#if quote}
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <img
                    src={`https://financialmodelingprep.com/image-stock/${ticker}.png`}
                    alt="logo"
                    class="w-5 h-5 rounded-full"
                  />
                  <span class=" text-sm"
                    >{removeCompanyStrings(quote?.name)}</span
                  >
                </div>

                <div class="flex items-baseline gap-3 mb-2">
                  <span class="text-2xl font-semibold">
                    {quote?.price?.toFixed(2) || "n/a"}
                  </span>
                  <span
                    class={`text-lg ${
                      (quote?.changesPercentage || 0) >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {(quote?.changesPercentage || 0) >= 0 ? "+" : "-"}{Math.abs(
                      quote?.change || 0,
                    ).toFixed(2)}
                    ({(quote?.changesPercentage || 0) >= 0
                      ? "+"
                      : ""}{quote?.changesPercentage?.toFixed(2) || "0.00"}%)
                  </span>
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <!-- Time Period Selector -->
        <!--
        <div class="flex gap-1 mb-4">
          {#each ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"] as item}
            <button
              on:click={() => changePlotPeriod(item)}
              class={`px-4 py-2 text-sm transition-colors ${
                selectedPlotPeriod === item
                  ? "text-white border-b-2 border-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {item}
            </button>
          {/each}
        </div>
        -->

        <!-- Chart -->
        <div class="w-full h-[200px] mb-8" use:highcharts={config}></div>

        <!-- Stock Details - Side by Side -->
        <div class="space-y-4">
          {#each displayTickerList as ticker}
            {@const quote = stockQuotes[ticker]}
            {#if quote}
              <div class="font-mono">
                <div class="flex justify-between items-center mb-4">
                  <h3 class=" font-medium text-lg">
                    {ticker?.toUpperCase()}
                  </h3>
                </div>
                <div class="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >Prev Close</span
                    >
                    <span>{quote?.previousClose?.toFixed(2) || "n/a"}</span>
                  </div>

                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >Day Range</span
                    >
                    <span
                      >{quote?.dayLow?.toFixed(2)} - {quote?.dayHigh?.toFixed(
                        2,
                      )}</span
                    >
                  </div>

                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >P/E Ratio</span
                    >
                    <span>{quote?.pe?.toFixed(2) || "n/a"}</span>
                  </div>

                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >Open</span
                    >
                    <span>{quote?.open?.toFixed(2) || "n/a"}</span>
                  </div>

                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >52W Range</span
                    >
                    <span
                      >{quote?.yearLow?.toFixed(2)} - {quote?.yearHigh?.toFixed(
                        2,
                      )}</span
                    >
                  </div>

                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >Dividend Yield</span
                    >
                    <span
                      >{quote?.dividendYield
                        ? `${(quote.dividendYield * 100).toFixed(3)}%`
                        : "n/a"}</span
                    >
                  </div>
                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >Volume</span
                    >
                    <span>{abbreviateNumber(quote?.volume) || "n/a"}</span>
                  </div>

                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >Market Cap</span
                    >
                    <span>{abbreviateNumber(quote?.marketCap)}</span>
                  </div>

                  <div class="flex justify-between items-center gap-4">
                    <span
                      class="text-gray-600 dark:text-gray-400 whitespace-nowrap"
                      >EPS</span
                    >
                    <span>{quote?.eps?.toFixed(2) || "n/a"}</span>
                  </div>
                </div>

                {#if tickerUrlMap[ticker]}
                  <div class="mt-6 font-sarif">
                    <a
                      href={tickerUrlMap[ticker]}
                      class="text-blue-600 sm:hover:text-blue-800 dark:text-blue-400 dark:sm:hover:text-blue-300 hover:underline text-sm"
                    >
                      More about {ticker?.toUpperCase()}
                    </a>
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {:else}
        <!-- Loading State -->
        <div class="flex justify-center items-center h-96">
          <div class="relative">
            <div class="bg-[#454A55] rounded p-4">
              <span class="loading loading-spinner loading-md text-gray-400"
              ></span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
