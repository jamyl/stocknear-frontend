import { error, fail, redirect } from "@sveltejs/kit";
import { validateData } from "$lib/utils";
import { loginUserSchema, registerUserSchema } from "$lib/schemas";
  import { defaultChats } from "$lib/utils";


export const load = async ({ locals }) => {
  const { pb, user } = locals;

  const getAllChats = async () => {
    if (!user) return [];

    const output = await pb.collection("chat").getList(1, 100, {
      sort: "-updated",
      filter: `user="${user.id}"`,
    });
    const lastUserMessages = output.items.map(chat => {
      const userMessages = chat.messages?.filter(m => m.role === "user");
      const lastMessage = userMessages?.at(-1)?.content || null;

      return {
        id: chat?.id,
        updated: chat?.updated,
        message: lastMessage,
      };
    });

 
    return lastUserMessages;
  };

  return {
    getAllChats: await getAllChats(),
        randomChats: defaultChats
    ?.sort(() => 0.5 - Math.random())
    ?.slice(0, 4)
    
  };
};


export const actions = {
  login: async ({ request, locals }) => {
    const { formData, errors } = await validateData(
      await request.formData(),
      loginUserSchema,
    );

    if (errors) {
      return fail(400, {
        data: formData,
        errors: errors.fieldErrors,
      });
    }

    try {
      await locals.pb
        .collection("users")
        .authWithPassword(formData.email, formData.password);

      /*	
            if (!locals.pb?.authStore?.model?.verified) {
                locals.pb.authStore.clear();
                return {
                    notVerified: true,
                };
            }
            */
    } catch (err) {
      console.log("Error: ", err);
      error(err.status, err.message);
    }

    redirect(302, "/chat");
  },

  register: async ({ locals, request }) => {
    const { formData, errors } = await validateData(
      await request.formData(),
      registerUserSchema,
    );

    if (errors) {
      return fail(400, {
        data: formData,
        errors: errors.fieldErrors,
      });
    }

    try {
      await locals.pb.collection("users").create(formData);
      /*
await locals.pb?.collection('users').update(
                newUser?.id, {
                    'freeTrial' : true,
                    'tier': 'Pro', //Give new users a free trial for the Pro Subscription
            });
*/
      await locals.pb.collection("users").requestVerification(formData.email);
    } catch (err) {
      console.log("Error: ", err);
      error(err.status, err.message);
    }

    try {
      await locals.pb
        .collection("users")
        .authWithPassword(formData.email, formData.password);
    } catch (err) {
      console.log("Error: ", err);
      error(err.status, err.message);
    }

    redirect(302, "/chat");
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
    //console.log("==================")
    //console.log(authMethods.authProviders)
    //console.log('target item is: ', targetItem)

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

