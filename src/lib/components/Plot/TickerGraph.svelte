<script lang="ts">
  import { abbreviateNumber } from "$lib/utils";
  import { mode } from "mode-watcher";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import { screenWidth } from "$lib/store";
  import highcharts from "$lib/highcharts.ts";
  import { onMount } from "svelte";

  export let tickerList = [];
  export let selectedPlotCategory = {
    name: "Stock Price",
    value: "close",
    type: "price",
  };

  let downloadWorker: Worker | undefined;

  let selectedPlotPeriod = "3Y";
  let config = null;
  let isLoaded = false;
  let rawGraphData = {};

  let categoryList = [
    { name: "Stock Price", value: "close", type: "price" },
    { name: "Market Cap", value: "marketCap", type: "marketCap" },
    { name: "Dividend Yield", value: "yield", type: "dividend" },
    { name: "Dividends", value: "adjDividend", type: "dividend" },
    {
      name: "Payout Ratio",
      value: "dividendPayoutRatio",
      type: "ratios-quarter",
    },
    { name: "Revenue", value: "revenue", type: "income" },
    {
      name: "Revenue Growth",
      value: "growthRevenue",
      type: "income-growth-ttm",
    },
    {
      name: "Operating Income",
      value: "operatingIncome",
      type: "income",
    },
    {
      name: "Operating Income Growth",
      value: "growthOperatingIncome",
      type: "income-growth-ttm",
    },
    { name: "Net Income", value: "netIncome", type: "income" },
    {
      name: "Net Income Growth",
      value: "growthNetIncome",
      type: "income-growth-ttm",
    },
    { name: "EBIT", value: "ebit", type: "income" },
    { name: "EBITDA", value: "ebitda", type: "income" },
    {
      name: "Operating Cash Flow",
      value: "operatingCashFlow",
      type: "cash-flow",
    },
    {
      name: "Operating Expenses",
      value: "operatingExpenses",
      type: "income",
    },
    { name: "Enterprise Value", value: "enterpriseValue", type: "key-metrics" },
    {
      name: "Short % Float",
      value: "shortPercentOfFloat",
      type: "share-statistics",
    },
    { name: "Short Ratio", value: "daysToCover", type: "share-statistics" },
    { name: "EPS (Diluted)", value: "epsDiluted", type: "income" },
    {
      name: "EPS Growth",
      value: "growthEPSDiluted",
      type: "income-growth-ttm",
    },
    {
      name: "Gross Profit Margin",
      value: "grossProfitMargin",
      type: "ratios-quarter",
    },
    { name: "Profit Margin", value: "netProfitMargin", type: "ratios-quarter" },
    {
      name: "Operating Margin",
      value: "operatingProfitMargin",
      type: "ratios-quarter",
    },
    { name: "EBITDA Margin", value: "ebitdaMargin", type: "ratios-quarter" },
    { name: "PE Ratio", value: "priceToEarningsRatio", type: "ratios-quarter" },
    { name: "PS Ratio", value: "priceToSalesRatio", type: "ratios-quarter" },
    { name: "PB Ratio", value: "priceToBookRatio", type: "ratios-quarter" },
    { name: "EV / Sales Ratio", value: "evToSales", type: "ratios-quarter" },
    { name: "EV / EBITDA Ratio", value: "evToEBITDA", type: "ratios-quarter" },
    {
      name: "EV / FCF Ratio",
      value: "evToFreeCashFlow",
      type: "ratios-quarter",
    },
    { name: "Income Tax", value: "incomeTaxExpense", type: "income" },
    {
      name: "Effective Tax Rate",
      value: "effectiveTaxRate",
      type: "ratios-quarter",
    },
    { name: "Free Cash Flow", value: "freeCashFlow", type: "cash-flow" },
    { name: "Total Debt", value: "totalDebt", type: "balance-sheet" },
    {
      name: "Research & Development",
      value: "researchAndDevelopmentExpenses",
      type: "income",
    },
    {
      name: "Shared-Based Compensation",
      value: "stockBasedCompensation",
      type: "cash-flow",
    },
    {
      name: "Return on Assets (ROA)",
      value: "returnOnAssets",
      type: "ratios-ttm",
    },
    {
      name: "Return on Equity (ROE)",
      value: "returnOnEquity",
      type: "ratios-ttm",
    },
    {
      name: "Return on Invested Capital (ROIC)",
      value: "returnOnInvestedCapital",
      type: "ratios-ttm",
    },
  ];

  const handleDownloadMessage = async (event) => {
    isLoaded = false;
    const output = event?.data?.output;
    rawGraphData = output?.graph;

    config = plotData() || null;

    isLoaded = true;
  };

  const colorPairs = [
    { light: "#1E90FF", dark: "#60A5FA" }, // DodgerBlue → SkyBlue
    { light: "#9400D3", dark: "#7C3AED" }, // DarkViolet → Violet
    { light: "#006400", dark: "#22C55E" }, // DarkGreen → Emerald
    { light: "#DC143C", dark: "#F43F5E" }, // Crimson → Rose
    { light: "#4682B4", dark: "#60A5FA" }, // SteelBlue → SkyBlue
    { light: "#FFFF00", dark: "#FACC15" }, // Yellow → Amber
    { light: "#A9A9A9", dark: "#D1D5DB" }, // DarkGray → Gray-300
    { light: "#000000", dark: "#F9FAFB" }, // Black → Gray-50
    { light: "#FF8C00", dark: "#FDBA74" }, // DarkOrange → Orange-300
    { light: "#20B2AA", dark: "#2DD4BF" }, // LightSeaGreen → Teal-300
  ];

  function changePlotPeriod(timePeriod) {
    isLoaded = false;
    selectedPlotPeriod = timePeriod;
    downloadWorker?.postMessage({
      tickerList: tickerList,
      category: selectedPlotCategory,
    });
  }
  async function changeCategory(category) {
    isLoaded = false;
    selectedPlotCategory = category;

    downloadWorker?.postMessage({
      tickerList: tickerList,
      category: selectedPlotCategory,
    });
  }

  function filterDataByTimePeriod(history) {
    const now = new Date();

    let thresholdDate;

    switch (selectedPlotPeriod) {
      case "1M":
        thresholdDate = new Date(now);
        thresholdDate.setMonth(now.getMonth() - 1);
        break;
      case "3M":
        thresholdDate = new Date(now);
        thresholdDate.setMonth(now.getMonth() - 3);
        break;
      case "YTD":
        thresholdDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "1Y":
        thresholdDate = new Date(now);
        thresholdDate.setFullYear(now.getFullYear() - 1);
        break;
      case "3Y":
        thresholdDate = new Date(now);
        thresholdDate.setFullYear(now.getFullYear() - 3);
        break;
      case "5Y":
        thresholdDate = new Date(now);
        thresholdDate.setFullYear(now.getFullYear() - 5);
        break;
      default: // "Max"
        thresholdDate = new Date(0);
    }

    return history?.filter((item) => new Date(item?.date) >= thresholdDate);
  }

  function plotData() {
    // 1) filter & parse each symbol's data into [timestamp, value] pairs
    const parsedData = {};

    for (const [symbol, data] of Object?.entries(rawGraphData)) {
      // Ensure `history` exists and is an array
      const series = Array?.isArray(data?.history) ? data?.history : [];

      // Filter by the desired time period and map to [timestamp, value] pairs
      parsedData[symbol] = filterDataByTimePeriod(series)?.map((item) => {
        const d = new Date(item?.date);
        return [
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            d.getUTCHours(),
            d.getUTCMinutes(),
          ),
          item?.value,
        ];
      });
    }

    // 3) build series entries
    const series = Object?.entries(parsedData)?.map(([symbol, data], index) => {
      // wrap around if more symbols than colors
      const pair = colorPairs[index % colorPairs?.length];

      return {
        name: symbol,
        type: "spline", // or "area" if you still want fill
        data,
        color: $mode === "light" ? pair?.light : pair?.dark,
        lineWidth: 1.5,
        marker: { enabled: false },
      };
    });

    // Check if the selected category is percentage-based
    const isPercentageCategory = [
      "dividendPayoutRatio",
      "yield",
      "netProfitMargin",
      "ebitdaMargin",
      "freeCashFlowMargin",
      "operatingProfitMargin",
      "growthRevenue",
      "growthEPSDiluted",
      "growthOperatingIncome",
      "growthNetIncome",
      "shortPercentOfFloat",
      "returnOnEquity",
      "returnOnAssets",
      "returnOnInvestedCapital",
      "grossProfitMargin",
      "effectiveTaxRate",
    ].includes(selectedPlotCategory?.value);

    return {
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        animation: false,
        height: 400,
        events: {
          render: function () {
            const chart = this;

            // 0) Destroy any stray labels when series count shrinks
            if (chart?.customLabels) {
              // if we have more labels than series, kill the extras
              const extra = chart.customLabels.length - chart.series.length;
              if (extra > 0) {
                for (
                  let j = chart.series.length;
                  j < chart.customLabels.length;
                  j++
                ) {
                  chart.customLabels[j].destroy();
                }
                // truncate the array
                chart.customLabels.length = chart.series.length;
              }
            } else {
              chart.customLabels = [];
            }

            // 1) Loop over current series and create/update their labels
            chart.series.forEach((serie, i) => {
              if (!serie.points?.length) return;

              const lastPoint = serie.points[serie.points.length - 1];
              const value = isPercentageCategory
                ? lastPoint.y.toFixed(2) + "%"
                : abbreviateNumber(lastPoint.y);
              const xPos = chart.plotWidth + 10;
              const yPos = lastPoint.plotY + chart.plotTop - 15;

              if (!chart.customLabels[i]) {
                // new series → draw a label
                chart.customLabels[i] = chart.renderer
                  .label(value, xPos, yPos, "bubble", 0, 0, true)
                  .attr({ padding: 5, r: 4, fill: serie.color, zIndex: 10 })
                  .css({ color: "#fff", fontSize: "11px" })
                  .add();
              } else {
                // existing series → move & update text
                chart.customLabels[i]
                  .attr({ text: value, x: xPos, y: yPos })
                  .toFront();
              }
            });
          },
        },
      },
      credits: { enabled: false },
      title: {
        text: `<h3 class="mt-3 mb-1"></h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "black" : "white" },
      },
      tooltip: {
        shared: ["price", "marketCap"]?.includes(selectedPlotCategory?.value),
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
          // Format the x value
          const dateStr = new Date(this?.x)?.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });

          let tooltipContent = `<span class="m-auto text-[1rem] font-[501] ">${dateStr}</span><br>`;

          // If shared, this.points is an array
          if (this.points) {
            this.points.forEach((point) => {
              const formattedValue = isPercentageCategory
                ? point.y.toFixed(2) + "%"
                : abbreviateNumber(point.y);

              tooltipContent += `
        <span style="display:inline-block; width:10px; height:10px; background-color:${point.color}; border-radius:5%; margin-right:3px;"></span>
        <span class="font-semibold text-xs">${point.series.name}:</span> 
        <span class="font-normal text-sm">${formattedValue}</span><br>`;
            });
          } else {
            // Non-shared, handle single point
            const formattedValue = isPercentageCategory
              ? this.y.toFixed(2) + "%"
              : abbreviateNumber(this.y);

            tooltipContent += `
      <span style="display:inline-block; width:10px; height:10px; background-color:${this.color}; border-radius:5%; margin-right:3px;"></span>
      <span class="font-semibold text-xs">${this.series.name}:</span> 
      <span class="font-normal text-sm">${formattedValue}</span><br>`;
          }

          return tooltipContent;
        },
      },
      xAxis: {
        type: "datetime",
        tickLength: 0,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: { color: $mode === "light" ? "black" : "white" },
          distance: 10,
          formatter() {
            const d = new Date(this.value);
            return `<span class="text-xs">${d.toLocaleDateString("en-US", {
              year: "2-digit",
              month: "short",
              timeZone: "UTC",
            })}</span>`;
          },
        },
        tickPositioner() {
          const { min, max } = this.getExtremes();
          const ticks = [];
          const count = $screenWidth < 640 ? 2 : 5;
          const interval = Math.floor((max - min) / count);
          for (let i = 0; i <= count; i++) {
            ticks.push(min + i * interval);
          }
          return ticks;
        },
      },
      yAxis: {
        startOnTick: true,
        endOnTick: true,
        gridLineWidth: 1,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
        title: { text: null },
        labels: {
          style: { color: $mode === "light" ? "black" : "white" },
          formatter: function () {
            if (isPercentageCategory) {
              return this.value.toFixed(2) + "%";
            }
            return abbreviateNumber(this.value);
          },
        },
        opposite: true,
      },
      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
          states: { hover: { enabled: false } },
          legendSymbol: "rectangle",
        },
      },
      legend: {
        enabled: true,
        align: "center", // left side
        verticalAlign: "bottom", // top edge
        layout: "horizontal",
        squareSymbol: false, // use our rectangle shape
        symbolWidth: 20,
        symbolHeight: 12,
        symbolRadius: 0,

        itemStyle: {
          color: $mode === "light" ? "black" : "white",
        },
      },

      series,
    };
  }

  onMount(async () => {
    if (!downloadWorker) {
      const DownloadWorker = await import(
        "$lib/workers/downloadCompareWorker?worker"
      );
      downloadWorker = new DownloadWorker.default();
      downloadWorker.onmessage = handleDownloadMessage;
    }

    downloadWorker?.postMessage({
      tickerList: tickerList,
      category: selectedPlotCategory,
    });
  });
</script>

{#if tickerList?.length > 0}
  <div class="w-full">
    {#if config && isLoaded}
      <div
        class="w-full relative mt-2 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between z-10"
      >
        <div class="flex w-fit space-x-2">
          {#each ["1Y", "3Y", "5Y", "Max"] as item}
            <label
              on:click={() => changePlotPeriod(item)}
              class="px-2 sm:px-3 py-1 {selectedPlotPeriod === item
                ? 'bg-gray-300 dark:bg-white text-muted'
                : 'text-muted dark:text-white bg-gray-100 dark:bg-table text-opacity-[0.6]'} text-xs border border-gray-200 dark:border-gray-700 font-semibold transition ease-out duration-100 sm:hover:bg-white sm:hover:text-black rounded-[2px] cursor-pointer"
            >
              {item}
            </label>
          {/each}
        </div>
      </div>
      <div
        class="shadow-xs border border-gray-300 dark:border-gray-800 rounded w-full h-[300px] sm:h-[400px]"
        use:highcharts={config}
      ></div>
    {:else}
      <div
        class="mt-2 flex justify-center items-center h-96 border border-gray-300 dark:border-gray-800 rounded"
      >
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
{/if}
