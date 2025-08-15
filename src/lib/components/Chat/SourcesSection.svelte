<script lang="ts">
  export let sources: Array<{
    name: string;
    description?: string;
    function: string;
    ticker?: string;
    timestamp?: string;
    type?: string;
    url?: string;
  }> = [];

  // Group sources by ticker for better organization
  const groupedSources = sources.reduce(
    (acc, source) => {
      const key = source.ticker || "General";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(source);
      return acc;
    },
    {} as Record<string, typeof sources>,
  );
</script>

{#if sources && sources.length > 0}
  <div
    class="sources-section mt-6 pt-4 border-t border-gray-300 dark:border-gray-600"
  >
    <div class="flex items-center gap-2 mb-2">
      <h4 class="text-sm font-semibold">Sources</h4>
      <span class="text-xs">({sources.length})</span>
    </div>

    <div class="sources-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each Object.entries(groupedSources) as [ticker, tickerSources]}
        <div class="source-group">
          {#if ticker !== "General"}
            <div class="ticker-header mb-2">
              <a
                href={tickerSources[0]?.type === "ETF"
                  ? `/etf/${ticker}`
                  : `/stocks/${ticker}`}
                class="inline-block badge border-blue-100 dark:border-gray-800 duration-0 bg-blue-50 dark:bg-primary font-semibold dark:font-normal rounded-sm ml-1 px-2 m-auto text-blue-700 dark:text-blue-400 dark:sm:hover:text-white sm:hover:text-muted"
                >{ticker}</a
              >
            </div>
          {/if}

          <div class="space-y-2">
            {#each tickerSources as source, i}
              <a
                href={source.url || "#"}
                class="source-item flex items-start gap-3 p-3 rounded-lg bg-gray-100 shadow dark:bg-primary sm:hover:bg-gray-100 dark:sm:hover:bg-secondary transition-all duration-50 group block"
                class:cursor-pointer={source.url}
                class:cursor-default={!source.url}
              >
                <div
                  class="avatar w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                >
                  <img
                    src={ticker?.length > 0 && ticker
                      ? `https://financialmodelingprep.com/image-stock/${ticker}.png`
                      : "/img/pwa-192x192.png"}
                    alt={`logo`}
                    class="shrink-0 w-3.5 h-3.5 rounded-full"
                  />
                </div>

                <div class="source-content flex-1 min-w-0">
                  <h5
                    class="source-name text-sm font-medium text-black dark:text-gray-100 truncate"
                  >
                    {source.name}
                  </h5>
                  <p
                    class="source-description text-xs text-gray-900 dark:text-gray-300 mt-0.5"
                  >
                    {source.description || "Live data from Stocknear"}
                  </p>
                </div>

                {#if source.url}
                  <div
                    class="source-link-icon flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                  ></div>
                {/if}
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .sources-section {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
