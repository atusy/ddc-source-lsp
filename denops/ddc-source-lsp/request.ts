import { Denops, register } from "./deps/denops.ts";
import { deadline, DeadlineError } from "./deps/std.ts";
import { is, u } from "./deps/unknownutil.ts";
import { Params } from "../@ddc-sources/lsp.ts";
import { Client } from "./client.ts";

export async function request(
  denops: Denops,
  lspEngine: Params["lspEngine"],
  method: string,
  params: unknown,
  opts: { client: Client; timeout: number; sync: boolean },
): Promise<unknown> {
  if (lspEngine === "nvim-lsp") {
    if (opts.sync) {
      return await denops.call(
        `luaeval`,
        `require("ddc_source_lsp.internal").request_sync(_A[1], _A[2], _A[3], _A[4])`,
        [opts.client.id, method, params, { timemout: opts.timeout }],
      );
    } else {
      const waiter = Promise.withResolvers();
      const lambda_id = register(
        denops,
        (res: unknown) => waiter.resolve(res),
        { once: true },
      );
      await denops.call(
        `luaeval`,
        `require("ddc_source_lsp.internal").request(_A[1], _A[2], _A[3], _A[4])`,
        [opts.client.id, method, params, {
          plugin_name: denops.name,
          lambda_id,
        }],
      );
      return deadline(waiter.promise, opts.timeout);
    }
  } else if (lspEngine === "vim-lsp") {
    const waiter = Promise.withResolvers();
    const id = register(
      denops,
      (res: unknown) => waiter.resolve(res),
      { once: true },
    );
    try {
      await denops.eval(
        `lsp#send_request(l:server, extend(l:request,` +
          `{'on_notification': {data -> denops#notify(l:name, l:id, [data])}}))`,
        {
          server: opts.client.id,
          request: { method, params },
          name: denops.name,
          id,
        },
      );
      const resolvedData = await deadline(waiter.promise, opts.timeout);
      const { response: { result } } = u.ensure(
        resolvedData,
        is.ObjectOf({ response: is.ObjectOf({ result: is.Any }) }),
      );
      return result;
    } catch (e) {
      if (e instanceof DeadlineError) {
        throw new Error(`No response from server ${opts.client.id}`);
      } else {
        throw new Error(`Unsupprted method: ${method}`);
      }
    }
  } else if (lspEngine === "lspoints") {
    return await denops.dispatch(
      "lspoints",
      "request",
      opts.client.id,
      method,
      params,
    );
  } else {
    lspEngine satisfies never;
    throw new Error(`unknown lspEngine: ${lspEngine}`);
  }
}
