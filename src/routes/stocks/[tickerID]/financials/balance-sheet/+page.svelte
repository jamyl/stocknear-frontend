<script lang="ts">
  import { displayCompanyName, stockTicker } from "$lib/store";

  import SEO from "$lib/components/SEO.svelte";
  import FinancialSection from "$lib/components/FinancialSection.svelte";

  export let data;

  const statementConfig = [
    {
      propertyName: "cashAndCashEquivalents",
      growthPropertyName: "growthCashAndCashEquivalents",
      label: "Cash & Equivalents",
      text: "Cash and equivalents is the amount of money on the company's accounts held as straight cash, or very liquid assets that can be sold for cash at a very short notice.",
    },
    {
      propertyName: "shortTermInvestments",
      growthPropertyName: "growthShortTermInvestments",
      label: "Short-Term Investments",
      text: "Short-term investments are liquid assets like treasury bills, short-term bonds, money-market funds, marketable securities and other investments that can be sold for cash at a short notice.",
    },
    {
      propertyName: "longTermInvestments",
      growthPropertyName: "growthLongTermInvestments",
      label: "Long-Term Investments",
      text: "Long-term investments are investments that the company plans to hold for more than one year. It can include stocks, bonds, real estate and others.",
    },
    {
      propertyName: "otherNonCurrentAssets",
      growthPropertyName: "growthOtherNonCurrentAssets",
      label: "Other Long-Term Assets",
      text: "Other long-term assets include all long-term assets that do not fit into any of the categories mentioned so far.",
    },
    {
      propertyName: "netReceivables",
      growthPropertyName: "growthNetReceivables",
      label: "Receivables",
      text: "Receivables are the money owed to the company for products or services that have been delivered but not yet paid for. If a customer buys something on credit, it is listed under receivables (as a current asset) on the balance sheet.",
    },
    {
      propertyName: "inventory",
      growthPropertyName: "growthInventory",
      label: "Inventory",
      text: "Inventory is the value of product that is available for sale, as well as the value of purchased raw materials for making goods that will be sold. It also includes goods that are currently being produced from raw materials.",
    },
    {
      propertyName: "otherCurrentAssets",
      growthPropertyName: "growthOtherCurrentAssets",
      label: "Other Current Assets",
      text: "Other current assets includes all current assets that do not fit into any of the categories mentioned so far.",
    },
    {
      propertyName: "totalCurrentAssets",
      growthPropertyName: "growthTotalCurrentAssets",
      label: "Total Current Assets",
      text: "Total current assets includes all current assets, including cash and equivalents, short-term investments, receivables, inventory and others. Current assets are things that easily be sold for cash or will be used within one year.",
    },
    {
      propertyName: "propertyPlantEquipmentNet",
      growthPropertyName: "growthPropertyPlantEquipmentNet",
      label: "Property-Plant & Equipment",
      text: "Property, Plant & Equipment are all long-term tangible or physical assets that are needed for business operations. It includes buildings, factories, machinery, furniture and others.",
    },
    {
      propertyName: "goodwillAndIntangibleAssets",
      growthPropertyName: "growthGoodwillAndIntangibleAssets",
      label: "Goodwill & Intangibles",
      text: "Includes goodwill and other assets that are intangible. Intangible assets are assets that provide some benefit for the company, but they are not physical assets that can be measured or counted. Examples include patents, intellectual property and copyrights.",
    },
    {
      propertyName: "totalNonCurrentAssets",
      growthPropertyName: "growthTotalNonCurrentAssets",
      label: "Total Long-Term Assets",
      text: "Total long-term assets includes all long-term assets, including Property-Plant & Equipment, goodwill, intangibles and others. Long-term (non-current) assets are things that can not be sold for cash easily or are considered to last for more than one year.",
    },
    {
      propertyName: "totalAssets",
      growthPropertyName: "growthTotalAssets",
      label: "Total Assets",
      text: "Total assets is the sum of all current and non-current assets on the balance sheet. Assets are everything that the company owns.",
    },
    {
      propertyName: "accountPayables",
      growthPropertyName: "growthAccountPayables",
      label: "Account Payables",
      text: "Accounts payable is the amount that the company owes to vendors and suppliers. The company has purchased products or services on credit, but has not paid for them yet.",
    },
    {
      propertyName: "deferredRevenue",
      growthPropertyName: "growthDeferredRevenue",
      label: "Deferred Revenue",
      text: "Deferred revenue includes payments that have been received in advance for products and services that have not yet been delivered. These revenues are listed as a liability on the company's balance sheet.",
    },
    {
      propertyName: "shortTermDebt",
      growthPropertyName: "growthShortTermDebt",
      label: "Short-Term Debt",
      text: "Current debt is company debt that needs to be paid within one year. It also includes the portion of long-term debt that is due within a year.",
    },
    {
      propertyName: "otherCurrentLiabilities",
      growthPropertyName: "growthOtherCurrentLiabilities",
      label: "Other Current Liabilities",
      text: "Other current liabilities are all current liabilities that do not fit into the categories above.",
    },
    {
      propertyName: "totalCurrentLiabilities",
      growthPropertyName: "growthTotalCurrentLiabilities",
      label: "Total Current Liabilities",
      text: "Total current liabilities are all financial obligations that the company owes and are due within one year. This includes accounts payable, deferred revenue, current debt and others.",
    },
    {
      propertyName: "longTermDebt",
      growthPropertyName: "growthLongTermDebt",
      label: "Long-Term Debt",
      text: "Long-term debt is debt that the company does not need to pay until after one year or more. It includes bank loans and bonds issued by the company.",
    },
    {
      propertyName: "otherNonCurrentLiabilities",
      growthPropertyName: "growthOtherNonCurrentLiabilities",
      label: "Other Long-Term Liabilities",
      text: "Other long-term liabilities are all long-term (non-current) liabilities that are not categorized as long-term debt.",
    },
    {
      propertyName: "totalNonCurrentLiabilities",
      growthPropertyName: "growthTotalNonCurrentLiabilities",
      label: "Total Long-Term Liabilities",
      text: "Total long-term liabilities are all long-term (non-current) financial obligations of the company, including long-term debt and others.",
    },
    {
      propertyName: "totalLiabilities",
      growthPropertyName: "growthTotalLiabilities",
      label: "Total Liabilities",
      text: "Total liabilities are all financial obligations of the company, including both current and long-term (non-current) liabilities. Liabilities are everything that the company owes.",
    },
    {
      propertyName: "totalDebt",
      growthPropertyName: "growthTotalDebt",
      label: "Total Debt",
      text: "Total debt is the total amount of liabilities categorized as debt on the balance sheet. It includes both current and long-term (non-current) debt.",
    },
    {
      propertyName: "commonStock",
      growthPropertyName: "growthCommonStock",
      label: "Common Stock",
      text: "Common stock is the par value of the company's outstanding common stock, multiplied by the par value. This information is not very useful as the par value is usually set as an arbitrary amount of one cent.",
    },
    {
      propertyName: "retainedEarnings",
      growthPropertyName: "growthRetainedEarnings",
      label: "Retained Earnings",
      text: "Retained earnings are net income previously earned that has not been paid out to shareholders as dividends. If retained earnings are negative, they can be listed as Accumulated Deficit instead.",
    },
    {
      propertyName: "accumulatedOtherComprehensiveIncomeLoss",
      growthPropertyName: "growthAccumulatedOtherComprehensiveIncomeLoss",
      label: "Comprehensive Income",
      text: "Comprehensive income includes unrealized gains and losses that do not fall under retained earnings.",
    },
    {
      propertyName: "totalStockholdersEquity",
      growthPropertyName: "growthTotalStockholdersEquity",
      label: "Shareholders Equity",
      text: "Shareholders’ equity is also called book value or net worth. It can be seen as the amount of money held by investors inside the company. It is calculated by subtracting all liabilities from all assets.",
    },
    {
      propertyName: "totalInvestments",
      growthPropertyName: "growthTotalInvestments",
      label: "Total Investments",
      text: "Total Investments encompass all a company's financial assets, such as stocks, bonds, and real estate, reflecting its financial health and growth potential. Calculated by summing up these asset values, it's a key indicator of a company's financial strength.",
    },
  ];
</script>

<SEO
  title={`${$displayCompanyName} (${$stockTicker}) Balance Sheet Analysis - Assets, Liabilities & Financial Position`}
  description={`Comprehensive balance sheet analysis for ${$displayCompanyName} (${$stockTicker}) with detailed breakdown of assets, liabilities, shareholders equity, debt levels, and financial position. Track ${$stockTicker} financial health with cash positions, working capital, debt-to-equity ratios, and asset quality metrics over multiple periods.`}
  keywords={`${$stockTicker} balance sheet, ${$displayCompanyName} assets, ${$stockTicker} liabilities, balance sheet analysis, shareholders equity, debt analysis, working capital, financial position, asset quality, cash position, debt-to-equity ratio, book value`}
  structuredData={{
    "@context": "https://schema.org",
    "@type": ["FinancialProduct", "WebPage", "AnalysisNewsArticle"],
    name: `${$displayCompanyName} (${$stockTicker}) Balance Sheet Analysis`,
    headline: `${$displayCompanyName} Financial Position - Balance Sheet & Asset Analysis`,
    description: `Detailed balance sheet analysis for ${$displayCompanyName} (${$stockTicker}) including assets, liabilities, equity, and financial position metrics`,
    url: `https://stocknear.com/stocks/${$stockTicker}/financials/balance-sheet`,

    author: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
      logo: {
        "@type": "ImageObject",
        url: "https://stocknear.com/favicon.png",
      },
    },
    dateModified: new Date().toISOString(),
    datePublished: new Date().toISOString(),
    mainEntity: {
      "@type": "Corporation",
      name: $displayCompanyName,
      tickerSymbol: $stockTicker,
    },
    about: {
      "@type": "Thing",
      name: "Balance Sheet Analysis",
      description:
        "Financial statement analysis focused on assets, liabilities, and financial position",
    },
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
        {
          "@type": "ListItem",
          position: 3,
          name: `${$displayCompanyName} (${$stockTicker})`,
          item: `https://stocknear.com/stocks/${$stockTicker}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "Financial Statements",
          item: `https://stocknear.com/stocks/${$stockTicker}/financials`,
        },
        {
          "@type": "ListItem",
          position: 5,
          name: "Balance Sheet",
          item: `https://stocknear.com/stocks/${$stockTicker}/financials/balance-sheet`,
        },
      ],
    },
  }}
/>

<FinancialSection {data} title="Balance Sheet Statement" {statementConfig} />
