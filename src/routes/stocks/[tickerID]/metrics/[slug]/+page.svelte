<script lang="ts">
  import { displayCompanyName, stockTicker } from "$lib/store";
  import {
    abbreviateNumber,
    monthNames,
    removeCompanyStrings,
  } from "$lib/utils";
  import SEO from "$lib/components/SEO.svelte";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  export let data;

  let names =
    data?.getBusinessMetrics?.revenue?.names?.map((name) =>
      name
        ?.toLowerCase()
        ?.replace(/&/g, "") // Remove & symbol
        ?.replace(/\s+/g, "-") // Replace spaces with dash
        ?.replace(/-{2,}/g, "-") // Replace multiple dashes with single dash
        ?.replace(/^-|-$/g, "") // Remove leading/trailing dashes
        ?.trim(),
    ) || [];

  let config = null;

  let rawData = data?.getBusinessMetrics?.revenue?.history;

  let dataset = [];
  let tableList = [];

  function convertToTitleCase(str) {
    return str
      ?.split("-") // Split the string by hyphen
      ?.map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
      ?.join(" ")
      ?.replace("Oem", "OEM");
  }

  function plotData() {
    const plotDataset = [...dataset]?.sort(
      (a, b) => new Date(a?.date) - new Date(b?.date),
    );
    const xData = plotDataset
      ?.filter((item) => item?.value !== null && item?.value !== undefined) // Filter out null values
      ?.map((item) => item?.date); // Get the date strings

    const valueList = [];
    for (let i = 0; i < plotDataset?.length; i++) {
      if (plotDataset[i]?.value) {
        valueList?.push(plotDataset[i]?.value);
      }
    }

    // Build the Highcharts configuration object.
    const options = {
      credits: {
        enabled: false,
      },
      chart: {
        type: "column",
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        height: 360, // Set the maximum height for the chart
        animation: false,
      },
      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg">${removeCompanyStrings($displayCompanyName)} Revenue by ${convertToTitleCase(data?.getParams)}</h3>`,
        style: {
          color: $mode === "light" ? "black" : "white",
          // Using inline CSS for margin-top and margin-bottom
        },
        useHTML: true, // Enable HTML to apply custom class styling
      },
      xAxis: {
        categories: xData,
        labels: {
          formatter: function () {
            // 'this.value' is the date string (e.g., "YYYY-MM-DD")
            const dateParts = this.value.split("-");
            const year = dateParts[0].substring(2); // last two digits of year
            const monthIndex = parseInt(dateParts[1], 10) - 1;
            return `${monthNames[monthIndex]} '${year}`;
          },
          style: {
            color: $mode === "light" ? "black" : "white",
            fontSize: "12px",
          },
          rotation: 45, // Rotate labels for better readability
        },
        tickmarkPlacement: "on",
      },
      yAxis: {
        gridLineWidth: 1,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
        labels: {
          style: { color: $mode === "light" ? "black" : "white" },
        },
        title: { text: null },
        opposite: true,
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
        <span class="font-semibold text-sm">${point.series.name}:</span> 
        <span class="font-normal text-sm">${abbreviateNumber(point.y)}</span><br>`;
          });

          return tooltipContent;
        },
      },
      plotOptions: {
        series: {
          color: "white",
          animation: false,
          dataLabels: {
            enabled: false,
            color: "white",
            style: {
              fontSize: "13px",
              fontWeight: "bold",
            },
            formatter: function () {
              return abbreviateNumber(this?.y);
            },
          },
        },
      },
      series: [
        {
          name: "Revenue",
          data: valueList,
          color: $mode === "light" ? "#2C6288" : "white",
          borderRadius: "2",
        },
      ],
      legend: {
        enabled: false,
      },
    };

    return options;
  }

  $: {
    if (($stockTicker && data?.getParams) || $mode) {
      dataset = [];
      tableList = [];
      // Find the index of the current getParams value in the names array
      const index = names?.indexOf(data.getParams?.toLowerCase());

      dataset = rawData?.map((entry) => ({
        date: entry.date,
        value: index !== -1 ? entry.value[index] : null,
        valueGrowth: index !== -1 ? entry.valueGrowth[index] : null,
      }));

      tableList = [...dataset];

      tableList = tableList?.sort(
        (a, b) => new Date(b?.date) - new Date(a?.date),
      );

      config = plotData() || null;
    }
  }
</script>

<SEO
  title={`${$displayCompanyName} (${$stockTicker}) Business Metrics | Revenue Breakdown & Segment Analysis`}
  description={`Comprehensive business metrics and segment analysis for ${$displayCompanyName} (${$stockTicker}). Track revenue by segment, gross margin analysis, profit breakdown by division, and detailed business unit performance with historical trends.`}
  keywords={`${$stockTicker} business metrics, ${$displayCompanyName} revenue breakdown, segment analysis, ${$stockTicker} revenue by segment, business unit performance, gross margin analysis, ${$stockTicker} profit breakdown, segment revenue trends`}
  type="website"
  url={`https://stocknear.com/stocks/${$stockTicker}/metrics/revenue`}
  structuredData={{
    "@context": "https://schema.org",
    "@type": ["FinancialProduct", "Dataset"],
    name: `${$displayCompanyName} Business Metrics`,
    description: `Professional business metrics and segment analysis for ${$displayCompanyName} (${$stockTicker})`,
    url: `https://stocknear.com/stocks/${$stockTicker}/metrics/revenue`,
    applicationCategory: "FinanceApplication",
    featureList: [
      "Revenue segment analysis",
      "Business unit breakdown",
      "Gross margin analysis",
      "Profit by division",
      "Historical segment trends",
      "Performance metrics tracking",
      "Business unit comparison",
      "Revenue contribution analysis",
    ],
    provider: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
    },
    mainEntity: {
      "@type": "Corporation",
      name: $displayCompanyName,
      tickerSymbol: $stockTicker,
    },
  }}
/>

<section class=" w-full overflow-hidden h-full">
  <div class="w-full flex justify-center w-full sm-auto h-full overflow-hidden">
    <div
      class="w-full relative flex justify-center items-center overflow-hidden"
    >
      <main class="w-full">
        <div class="sm:pl-7 sm:pb-7 sm:pt-7 pt-3 m-auto mt-2 sm:mt-0 w-full">
          <div class="mb-3">
            <h1 class="text-xl sm:text-2xl font-bold">
              {convertToTitleCase(data?.getParams)} Revenue
            </h1>
          </div>

          {#if rawData?.length !== 0}
            <div
              class="chart mt-5 sm:mt-0 border border-gray-300 dark:border-gray-800 rounded"
              use:highcharts={config}
            ></div>

            <h2 class="mt-5 text-xl sm:text-2xl font-bold">History</h2>

            <div class="w-full overflow-x-auto">
              <table
                class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
              >
                <thead class="text-white bg-default">
                  <tr class="border-b border-gray-300 dark:border-gray-800">
                    <th class=" font-semibold text-start text-sm sm:text-[1rem]"
                      >Quarter</th
                    >
                    <th class=" font-semibold text-end text-sm sm:text-[1rem]"
                      >Value</th
                    >
                    <th class=" font-semibold text-end text-sm sm:text-[1rem]">
                      Change
                    </th>
                    <th class=" font-semibold text-end text-sm sm:text-[1rem]"
                      >Growth</th
                    >
                  </tr>
                </thead>
                <tbody>
                  {#each tableList as item, index}
                    <!-- row -->
                    <tr
                      class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                    >
                      <td class=" text-sm sm:text-[1rem] whitespace-nowrap">
                        {new Date(item?.date ?? null)?.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td
                        class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                      >
                        {@html item?.value !== null && item?.value !== undefined
                          ? abbreviateNumber(item?.value, false, true)
                          : "n/a"}
                      </td>

                      <td
                        class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                      >
                        {#if Number(item?.value - tableList[index + 1]?.value)}
                          {@html abbreviateNumber(
                            item?.value - tableList[index + 1]?.value,
                            false,
                            true,
                          )}
                        {:else}
                          n/a
                        {/if}
                      </td>

                      <td
                        class=" text-sm sm:text-[1rem] whitespace-nowrap text-end"
                      >
                        {#if item?.valueGrowth > 0}
                          <span class="text-green-800 dark:text-[#00FC50]">
                            +{item?.valueGrowth?.toFixed(2)}%
                          </span>
                        {:else if item?.valueGrowth < 0}
                          <span class="text-red-800 dark:text-[#FF2F1F]">
                            {item?.valueGrowth?.toFixed(2)}%
                          </span>
                        {:else}
                          n/a
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <h2
              class="mt-16 flex justify-center items-center text-2xl mb-5 m-auto"
            >
              No data available
            </h2>
          {/if}
        </div>
      </main>
    </div>
  </div>
</section>
