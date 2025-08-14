import { error, fail, redirect } from "@sveltejs/kit";
import { validateData, checkDisposableEmail, validateReturnUrl } from "$lib/utils";
import { loginUserSchema, registerUserSchema } from "$lib/schemas";

export const load = async ({ locals, params }) => {
  const { apiKey, apiURL } = locals;
  const { tickerID } = params;

  const urlQuote   = `${apiURL}/stock-quote`;
  const urlMaxPain = `${apiURL}/max-pain`;
  const headers = {
    "Content-Type": "application/json",
    "X-API-KEY": apiKey,
  };
  const body = JSON.stringify({ ticker: tickerID });

  // Kick off both requests in parallel
  const [quoteRes, maxPainRes] = await Promise.all([
    fetch(urlQuote,   { method: "POST", headers, body }),
    fetch(urlMaxPain, { method: "POST", headers, body }),
  ]);

  // Parse both JSON bodies in parallel
  const [quoteJson, maxPainData] = await Promise.all([
    quoteRes.json(),
    maxPainRes.json(),
  ]);

  const currentPrice = quoteJson?.price ?? 0;

  // Compute changes
  const output = (maxPainData || []).map(item => ({
    ...item,
    change:          item.maxPain - currentPrice,
    changesPercentage: currentPrice
      ? (item.maxPain / currentPrice - 1) * 100
      : 0,
  }));

  return { getData: output };
};

export const actions = {
    login: async ({ request, locals, url, cookies }) => {
        const { formData, errors } = await validateData(
            await request.formData(),
            loginUserSchema
        );

        if (errors) {
            return fail(400, {
                data: formData,
                errors: errors.fieldErrors
            });
        }

        try {
            await locals.pb.collection('users')
                .authWithPassword(formData.email, formData.password);
        } catch (err: any) {
            console.log('Error: ', err);
            throw error(err.status || 500, err.message || 'Login failed');
        }

        // Get return URL from query or cookie
        const returnUrl = url.searchParams.get('returnUrl') ||
                          cookies.get('returnUrl') ||
                          '/';

        // Remove cookie after use
        cookies.delete('returnUrl', { path: '/' });

        // Validate and redirect
        throw redirect(302, validateReturnUrl(returnUrl, url.origin));
    },

    register: async ({ locals, request, url, cookies }) => {
        const { formData, errors } = await validateData(
            await request.formData(),
            registerUserSchema
        );

        if (errors) {
            return fail(400, {
                data: formData,
                errors: errors.fieldErrors
            });
        }

        const isEmailDisposable = await checkDisposableEmail(formData?.email);
        if (isEmailDisposable === 'true') {
            throw error(400, 'Disposable Email Addresses not allowed!');
        }

        try {
            const newUser = await locals.pb.collection('users').create(formData);
            await locals.pb.collection('users').update(newUser?.id, {
                credits: 10
            });
            await locals.pb.collection('users').requestVerification(formData.email);
            await locals.pb.collection('users')
                .authWithPassword(formData.email, formData.password);
        } catch (err: any) {
            console.log('Error: ', err);
            throw error(err.status || 500, err.message || 'Registration failed');
        }

        // Get return URL from query or cookie
        const returnUrl = url.searchParams.get('returnUrl') ||
                          cookies.get('returnUrl') ||
                          '/profile';

        // Remove cookie
        cookies.delete('returnUrl', { path: '/' });

        // Validate and redirect
        throw redirect(302, validateReturnUrl(returnUrl, url.origin));
    },

      oauth2: async ({ url, locals, request, cookies }) => {
    
        const path = url?.href?.replace("/oauth2","")
        const authMethods = (await locals?.pb
          ?.collection("users")
          ?.listAuthMethods())?.oauth2;
    
    
        const data = await request?.formData();
        const providerSelected = data?.get("provider");
    
        if (!authMethods) {
          return {
            authProviderRedirect: "",
            authProviderState: "",
          };
        }
        const redirectURL = `${url.origin}/oauth`;
    
        const targetItem = authMethods?.providers?.findIndex(
          (item) => item?.name === providerSelected,
        );
    
        const provider = authMethods.providers[targetItem];
        const authProviderRedirect = `${provider.authUrl}${redirectURL}`;
        const state = provider.state;
        const verifier = provider.codeVerifier;
    
        
        
        cookies.set("state", state, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60 * 60,
        });
    
        cookies.set("verifier", verifier, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60 * 60,
        });
    
        cookies.set("provider", providerSelected, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60 * 60,
        });
    
        cookies.set("path", path, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60,
        });
    
        redirect(302, authProviderRedirect);
      },
};

