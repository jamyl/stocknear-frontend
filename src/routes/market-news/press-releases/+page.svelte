<script lang="ts">
  import { onMount } from "svelte";
  import SEO from "$lib/components/SEO.svelte";

  export let data;

  let rawData = data?.getPressNews;
  let stockNews = data?.getStockNews;
  let news = rawData.slice(0, 10) ?? [];

  const formatDate = (dateString) => {
    // Create a date object for the input dateString
    const inputDate = new Date(dateString);

    // Create a date object for the current time in New York City
    const nycTime = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    });
    const currentNYCDate = new Date(nycTime);

    // Calculate the difference in milliseconds
    const difference = inputDate.getTime() - currentNYCDate.getTime();

    // Convert the difference to minutes
    const minutes = Math.abs(Math.round(difference / (1000 * 60)));

    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.round(minutes / 60);
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    } else {
      const days = Math.round(minutes / 1440);
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
  };

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && news?.length !== rawData?.length) {
      const nextIndex = news?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 25);
      news = [...news, ...filteredNewResults];
    }
  }

  onMount(async () => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
</script>

<SEO
  title="Press
    Releases From Publicly Traded Companies"
  description="Press releases for publicly traded companies on the US stock market. Includes important company events, earnings releases and more."
/>

<div class="w-full overflow-hidden m-auto mt-5">
  <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
    <div
      class="relative flex flex-col lg:flex-row justify-center items-start overflow-hidden w-full"
    >
      <main class="w-full lg:w-3/4 lg:pr-10">
        <div class="w-full m-auto">
          <div class="grid grid-cols-1 gap-y-3">
            {#if news.length !== 0}
              {#each news as item}
                <div class="w-full flex flex-col m-auto">
                  <div class="w-full flex flex-col sm:flex-row">
                    <a
                      href={item?.url}
                      rel="noopener noreferrer"
                      target="_blank"
                      class="w-full sm:max-w-56 h-fit max-h-96 sm:mr-3"
                    >
                      <div class="shrink-0 m-auto">
                        <img
                          src={item?.image}
                          class="h-full w-full object-cover rounded"
                          alt="news image"
                          loading="lazy"
                        />
                      </div>
                    </a>

                    <div class="w-full">
                      <h3
                        class="text-sm text-muted dark:text-white/80 truncate mb-2"
                      >
                        {formatDate(item?.publishedDate)} ago · {item?.site}
                      </h3>

                      <a
                        href={item?.url}
                        rel="noopener noreferrer"
                        target="_blank"
                        class="text-lg sm:text-xl font-bold"
                      >
                        {item?.title}
                        <p class=" text-sm mt-2 font-normal">
                          {item?.text?.length > 200
                            ? item?.text?.slice(0, 200) + "..."
                            : item?.text}
                        </p>
                      </a>
                      <div class=" mt-2">
                        <span>Stocks:</span>

                        <a
                          href={"/stocks/" + item?.symbol}
                          class="px-2.5 text-sm py-0.5 rounded bg-white/10 sm:hover:bg-white/20 ml-1"
                        >
                          {item?.symbol}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <hr
                  class="border-gray-300 dark:border-gray-600 w-full m-auto mt-3 mb-5"
                />
              {/each}
            {/if}
          </div>
        </div>
      </main>
      <aside class="inline-block relative w-full lg:w-1/4 mt-3">
        {#if !["Pro", "Plus"]?.includes(data?.user?.tier) || data?.user?.freeTrial}
          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href="/pricing"
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-semibold sm:ml-3">
                  Pro Subscription
                </h2>
              </div>
              <span class=" p-3 sm:ml-3 sm:mr-3 -mt-4">
                Upgrade now for unlimited access to all data, tools and no ads.
              </span>
            </a>
          </div>
        {/if}

        {#if stockNews?.length !== 0}
          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit mt-4 cursor-pointer"
          >
            <div class="p-4 text-sm">
              <h3 class="text-xl font-bold mb-3">Stock News</h3>
              <ul class="">
                {#each stockNews?.slice(0, 10) as item}
                  <li class="mb-3 last:mb-1">
                    {formatDate(item?.publishedDate)} ago -
                    <a
                      class="sm:hover:text-muted dark:sm:hover:text-white text-blue-800 dark:text-blue-400"
                      href={item?.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow">{item?.title}</a
                    >
                    - {item?.site}
                  </li>
                {/each}
              </ul>
              <a
                href={`/market-news`}
                class="flex justify-center items-center rounded cursor-pointer w-full py-2 mt-5 text-[1rem] text-center font-semibold text-white dark:text-black m-auto sm:hover:bg-default dark:sm:hover:bg-gray-300 bg-black dark:bg-[#fff] transition duration-100"
              >
                More Stock News
              </a>
            </div>
          </div>
        {/if}
      </aside>
    </div>
  </div>
</div>
