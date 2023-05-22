import { GuerrillaMail } from "./guerrillamail.js";
import yargs from "yargs";
import { camelCase } from "change-case";
import fs from "fs-extra";
import util from "util";
import url from "url";
import "setimmediate";
import mkdirp from "mkdirp";
import path from "path";
import { getLogger } from "./logger.js";

const args = yargs(process.argv);

const logger = getLogger();

export async function saveSession(
  guerrillamail,
  json = false,
  filename = "session.json"
) {
  await mkdirp(path.join(process.env.HOME, ".guerrillamail"));

  await fs.writeFile(
    path.join(process.env.HOME, ".guerrillamail", filename),
    guerrillamail.toJSON()
  );
  if (!json) logger.info("saved to ~/" + path.join(".guerrillamail", filename));
}

export async function initSession() {
  const proxyOptions = await loadProxy();
  const guerrillamail = new GuerrillaMail({ proxyOptions });
  logger.info("getting session");
  await saveSession(guerrillamail);
}

export async function loadSession() {
  const proxyOptions = await loadProxy();
  const guerrillamail = GuerrillaMail.fromJSON(
    await fs.readFile(path.join(process.env.HOME, ".guerrillamail", "session.json"))
  );
  guerrillamail.proxyOptions = proxyOptions;
  return guerrillamail;
}

const proxyStringToObject = (proxyUri: string) => {
  const parsed = url.parse(proxyUri);
  const [username, ...passwordParts] = (parsed.auth || "").split(":");
  return {
    type: parsed.protocol.replace(":", ""),
    hostname: parsed.hostname,
    port: parsed.port,
    userId: username || null,
    password: passwordParts.join(":") || null,
  };
};

const objectToProxyString = (o: any) => {
  return (
    (o.type === "socks" ? "socks5://" : o.type + "://") +
    (o.userId ? o.userId + ":" + o.password + "@" : "") +
    o.hostname +
    (o.port ? ":" + o.port : "")
  );
};

export async function setProxy(proxyUri: string) {
  await mkdirp(path.join(process.env.HOME, ".guerrillamail"));
  const proxyOptions = proxyStringToObject(proxyUri);
  const joined = objectToProxyString(proxyOptions);
  await fs.writeFile(path.join(process.env.HOME, ".guerrillamail", "proxy"), joined);
  logger.info("set-proxy: " + joined);
}

export async function unsetProxy() {
  await mkdirp(path.join(process.env.HOME, ".guerrillamail"));
  await fs.unlink(path.join(process.env.HOME, ".guerrillamail", "proxy"));
  logger.info("unset-proxy");
}

export async function loadProxy() {
  await mkdirp(path.join(process.env.HOME, ".guerrillamail"));
  try {
    return proxyStringToObject(
      await fs.readFile(
        path.join(process.env.HOME, ".guerrillamail", "proxy"),
        "utf8"
      )
    );
  } catch (e) {
    return null;
  }
}

export async function callAPI(command, data) {
  const guerrillamail = await loadSession();
  const camelCommand = camelCase(command);
  const json = data.j || data.json;
  const coerce = data.c || data.coerce;
  delete data.j;
  delete data.json;
  delete data.c;
  delete data.coerce;
  if (data.insecure) guerrillamail.insecure = true;
  delete data.insecure;
  if (!guerrillamail[camelCommand]) throw Error("command not found: " + command);
  if (json)
    guerrillamail.logger = new Proxy(
      {},
      {
        get(v) {
          return () => {};
        },
      }
    ) as any;
  const result = await guerrillamail[camelCommand](data);
  const coerced =
    coerce && typeof result.json === "function"
      ? await (async () => {
          const text = await result.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            return text;
          }
        })()
      : result;
  if (json) console.log(JSON.stringify(coerced, null, 2));
  else logger.info(coerced);
  await saveSession(guerrillamail, json);
  return result;
}

export async function saveSessionAs(name) {
  const guerrillamail = await loadSession();
  await saveSession(guerrillamail, false, name + ".json");
}

export async function loadSessionFrom(name) {
  const guerrillamail = GuerrillaMail.fromObject(
    JSON.parse(await fs.readFile(path.join(process.env.HOME, ".guerrillamail", name), "utf8"))
  );
  await saveSession(guerrillamail);
}

export async function loadFiles(data: any) {
  const fields = [];
  for (let [k, v] of Object.entries(data)) {
    const parts = /(^.*)FromFile$/.exec(k);
    if (parts) {
      const key = parts[1];
      fields.push([key, await fs.readFile(v)]);
    } else {
      fields.push([k, v]);
    }
  }
  return fields.reduce((r, [k, v]) => {
    r[k] = v;
    return r;
  }, {});
}

export async function runCLI() {
  const [command, ...subquery] = args.argv._.slice(2);
  const options = Object.assign({}, args.argv);
  delete options._;
  const data = await loadFiles(
    Object.entries(options).reduce((r, [k, v]) => {
      r[camelCase(k)] = String(v);
      return r;
    }, {})
  );
  switch (command) {
    case "init":
      return await initSession();
      break;
    case "set-proxy":
      return await setProxy(subquery[0]);
      break;
    case "unset-proxy":
      return await unsetProxy();
      break;
    case "save":
      return await saveSessionAs(subquery[0]);
      break;
    case "load":
      return await loadSessionFrom(subquery[0]);
      break;
    default:
      return await callAPI(command, data);
      break;
  }
}
