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
    <div class="flex items-center gap-2 mb-4">
      <h4 class="text-sm font-semibold text-gray-600 dark:text-gray-400">
        Sources
      </h4>
      <span class="text-xs text-gray-500 dark:text-gray-500"
        >({sources.length})</span
      >
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
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <span>{ticker}</span>
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          {/if}

          <div class="space-y-2">
            {#each tickerSources as source, i}
              <a
                href={source.url || "#"}
                class="source-item flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200 group block"
                class:cursor-pointer={source.url}
                class:cursor-default={!source.url}
              >
                <div
                  class="source-number flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400"
                >
                  {i + 1}
                </div>

                <div class="source-content flex-1 min-w-0">
                  <h5
                    class="source-name text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                  >
                    {source.name}
                  </h5>
                  <p
                    class="source-description text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                  >
                    {source.description || "Live data from Stocknear"}
                  </p>
                </div>

                {#if source.url}
                  <div
                    class="source-link-icon flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                  >
                    <svg
                      class="w-4 h-4 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </div>
                {/if}
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
      <p
        class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
      >
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        Data sourced from verified financial databases and real-time market feeds
      </p>
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

  .source-item {
    border: 1px solid transparent;
  }

  .source-item:hover {
    border-color: rgb(59 130 246 / 0.1);
  }

  :global(.dark) .source-item:hover {
    border-color: rgb(59 130 246 / 0.2);
  }
</style>
