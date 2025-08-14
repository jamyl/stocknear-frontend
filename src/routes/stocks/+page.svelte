<script lang="ts">
  import ArrowLogo from "lucide-svelte/icons/move-up-right";
  import Table from "$lib/components/Table/Table.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  let rawData = data?.getStockList;

  const defaultList = [
    { name: "Industry", rule: "industry" },
    { name: "Market Cap", rule: "marketCap" },
    { name: "Revenue", rule: "revenue" },
  ];

  const excludedRules = new Set(["industry", "revenue", "marketCap"]);
</script>

<SEO
  title="Stock Market Analysis - All US Stock Tickers & Real-Time Quotes "
  description="Complete list of all US stock ticker symbols with real-time quotes, market data, and analysis tools. Access comprehensive stock analysis for NYSE, NASDAQ stocks including TSLA, NVDA, AAPL and thousands more."
  keywords="stock tickers, stock symbols, stock list, US stocks, NYSE stocks, NASDAQ stocks, stock market, stock quotes, stock analysis, all stocks, stock screener"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All US Stock Tickers",
    description: "Complete list of US stock ticker symbols with analysis tools",
    url: "https://stocknear.com/stocks",
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
          name: "Stocks",
          item: "https://stocknear.com/stocks",
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      name: "US Stock Tickers",
      description: "List of all US stock ticker symbols",
      numberOfItems: rawData?.length || 0,
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pb-20 pt-5 px-4 lg:px-3"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li class="text-muted dark:text-gray-300">All Stocks</li>
    </ul>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:w-3/4 lg:pr-5">
          <div class="mb-2 border-b-[2px]">
            <h1 class="mb-1 e text-2xl sm:text-3xl font-bold">
              All Stock Symbols
            </h1>
            <p class="mb-3 px-1 font-semibold sm:px-0">
              List of all {rawData?.length} stock symbols we support
            </p>
          </div>

          <div class="w-full m-auto">
            <!--Start Top Winners/Losers-->
            <div class="flex flex-col justify-center items-center">
              <Table {data} {rawData} {defaultList} {excludedRules} />
            </div>
          </div>
        </main>
        <aside class="hidden lg:block relative fixed w-1/4 ml-4">
          {#if !["Pro", "Plus"]?.includes(data?.user?.tier) || data?.user?.freeTrial}
            <div
              class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
            >
              <a
                href="/pricing"
                class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
              >
                <div class="w-full flex justify-between items-center p-3 mt-3">
                  <h2 class="text-start text-xl font-semibold e ml-3">
                    Pro Subscription
                  </h2>
                  <ArrowLogo
                    class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:text-white"
                  />
                </div>
                <span class="e p-3 ml-3 mr-3">
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
              href="/stock-screener"
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-semibold e ml-3">
                  Stock Screener
                </h2>
                <ArrowLogo
                  class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:text-white"
                />
              </div>
              <span class="e p-3 ml-3 mr-3">
                Filter, sort and analyze all stocks to find your next
                investment.
              </span>
            </a>
          </div>

          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href="/watchlist/stocks"
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-semibold e ml-3">
                  Watchlist
                </h2>
                <ArrowLogo
                  class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:text-white"
                />
              </div>
              <span class="e p-3 ml-3 mr-3">
                Keep track of your favorite stocks in realt-time.
              </span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>
