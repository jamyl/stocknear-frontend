<script lang="ts">
  import Table from "$lib/components/Table/Table.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  const defaultList = [
    { name: "Income Tax", rule: "incomeTaxExpense" },
    { name: "Price", rule: "price" },
    { name: "% Change", rule: "changesPercentage" },
    { name: "Market Cap", rule: "marketCap" },
  ];
</script>

<SEO
  title="Highest Income Tax Companies - US Companies That Pay Most Taxes | Stocknear"
  description="List of US companies paying the highest income taxes ranked by corporate tax payments. Discover which public companies contribute most in federal income tax expenses and corporate tax rates."
  keywords="highest income tax companies, companies paying most taxes, corporate tax payments, income tax expense, corporate tax rates, highest corporate taxes, US tax paying companies"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Highest Income Tax Companies",
    description: "US companies ranked by highest corporate income tax payments",
    url: "https://stocknear.com/list/highest-income-tax",
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
          name: "Stock Lists",
          item: "https://stocknear.com/list",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Highest Income Tax",
          item: "https://stocknear.com/list/highest-income-tax",
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Companies by Income Tax Payments",
      description:
        "List of US public companies ranked by corporate income tax expenses",
      numberOfItems: data?.getData?.length || 0,
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li>
        <a href="/list" class="text-muted dark:text-gray-300">Stock Lists</a>
      </li>
      <li class="text-muted dark:text-gray-300">Highest Income Tax</li>
    </ul>
  </div>

  <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px] mt-5">
    <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
      Highest Income Tax Companies
    </h1>
  </div>

  <Infobox
    text="These are the biggest public companies in the US, ranked by the total amount of corporate income taxes they paid in the past 12 months. Track which companies contribute most to federal tax revenue."
  />

  <!-- Page wrapper -->
  <Table {data} rawData={data?.getData} {defaultList} />
</section>
