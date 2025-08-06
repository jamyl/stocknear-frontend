<script lang="ts">
  import SEO from "$lib/components/SEO.svelte";
  import confetti from "canvas-confetti";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  export let data;

  let tier = $page.url.searchParams.get("tier") ?? "Unlimited";

  const emailAddress = "support@stocknear.com";

  var duration = 5 * 500;
  var animationEnd = Date.now() + duration;
  var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  onMount(async () => {
    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    var interval = setInterval(function () {
      var timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      var particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  });
</script>

<SEO title="Welcome to Stocknear" description="" />

<main class="text-muted dark:text-white w-full min-h-screen pb-20">
  <section
    class="border-b border-gray-200 dark:border-none shadow dark:border-gray-800 sm:rounded w-full bg-gray-100 dark:bg-gray-500/20"
  >
    <div class="mx-auto max-w-7xl px-6 py-16 sm:py-2 md:px-8">
      <div class="text-center">
        <img
          class="m-auto w-20 sm:w-24 rounded-full mb-5 mt-3"
          src="/pwa-192x192.png"
          alt="Stocknear Logo"
          loading="lazy"
        />
        <h1 class="mt-1 text-4xl font-bold sm:text-5xl">
          You have now {tier} Access!
        </h1>
        <p
          class="mx-auto mt-5 max-w-3xl text-xl leading-relaxed md:mt-7 md:text-2xl mb-10"
        >
          Discover fresh investment ideas, real-time market updates, and expert
          insights—all just one click away.
        </p>
      </div>
    </div>
  </section>

  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
    <h2 class="text-xl font-semibold mb-5">Hello there 👋,</h2>

    <p class="mb-5 text-base md:text-lg leading-relaxed">
      Thank you for subscribing to <strong>Stocknear</strong>! As the sole
      creator—handling everything from backend development to customer support.
      I’m committed to keeping our platform both affordable and accessible for
      every investor.
    </p>

    <p class="mb-5 text-base md:text-lg leading-relaxed">
      Our plans are designed so that premium stock data and market insights stay
      within reach for retail investors of all backgrounds. If you ever need
      help or have questions about any of Stocknear’s features, just drop me a
      line at
      <a
        href="mailto:{emailAddress}"
        class="text-blue-800 dark:text-blue-400 hover:underline"
      >
        {emailAddress}
      </a>.
    </p>

    <p class="mb-5 text-base md:text-lg leading-relaxed">
      Your support directly helps us:
    </p>
    <ul class="list-disc list-inside mb-5 text-base md:text-lg leading-relaxed">
      <li>Maintain our low price point</li>
      <li>Enhance data quality and roll out new features</li>
      <li>
        Move closer to our goal of becoming the #1 stock analysis platform
      </li>
    </ul>

    <p class="text-base md:text-lg leading-relaxed">
      Thanks again for joining <strong>Stocknear</strong>. Expect fast, regular
      updates and new features coming your way!
    </p>

    <a
      href="/"
      class="flex justify-center items-center w-fit px-10 m-auto py-2.5 mt-10 rounded duration-100 bg-black text-white sm:hover:bg-default dark:bg-[#fff] dark:sm:hover:hover:bg-gray-300 dark:text-black font-semibold"
    >
      Start Researching Now!
    </a>
  </div>
</main>
