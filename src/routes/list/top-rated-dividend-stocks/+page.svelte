<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";
  export let data;

  const defaultList = [
    { name: "Dividend Yield", rule: "dividendYield" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Market Cap", rule: "marketCap" },
  ];
</script>

<SEO
  title="Top-Rated Dividend Stocks - Analyst Buy Recommendations | Stocknear"
  description="Complete list of dividend stocks rated as Buy or Strong Buy by analysts. High-quality dividend stocks with sustainable yields, strong fundamentals, and positive analyst sentiment for income investing."
  keywords="top rated dividend stocks, buy rated dividend stocks, analyst recommendations dividend, dividend stock ratings, dividend aristocrats, quality dividend stocks, income stocks buy rating"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Top-Rated Dividend Stocks List",
    "description": "Complete directory of dividend stocks with Buy or Strong Buy analyst ratings",
    "url": "https://stocknear.com/list/top-rated-dividend-stocks",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://stocknear.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Stock Lists",
          "item": "https://stocknear.com/list"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Top-Rated Dividend Stocks",
          "item": "https://stocknear.com/list/top-rated-dividend-stocks"
        }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "High-Quality Dividend Stocks Directory",
      "description": "List of dividend stocks with Buy or Strong Buy analyst ratings and sustainable yields",
      "numberOfItems": data?.getDividendStocks?.length || 0
    }
  }}
/>

<section class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3">
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li><a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a></li>
      <li class="text-muted dark:text-gray-300">Top-Rated Dividend Stocks</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Top-Rated Dividend Stocks List
    </h1>
  </div>

  <Infobox
    text="Comprehensive list of high-quality dividend stocks with Buy or Strong Buy analyst ratings. Each stock has consensus ratings from at least 10 analysts, dividend yields of 2% or higher, and payout ratios below 60% for sustainable income generation."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getDividendStocks} {defaultList} />
</section>
