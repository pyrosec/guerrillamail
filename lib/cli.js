"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCLI = exports.loadFiles = exports.loadSessionFrom = exports.saveSessionAs = exports.callAPI = exports.loadProxy = exports.unsetProxy = exports.setProxy = exports.loadSession = exports.initSession = exports.saveSession = void 0;
const guerrillamail_js_1 = require("./guerrillamail.js");
const yargs_1 = __importDefault(require("yargs"));
const change_case_1 = require("change-case");
const fs_extra_1 = __importDefault(require("fs-extra"));
const url_1 = __importDefault(require("url"));
require("setimmediate");
const mkdirp_1 = __importDefault(require("mkdirp"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = require("./logger.js");
const logger = (0, logger_js_1.getLogger)();
async function saveSession(guerrillamail, json = false, filename = "session.json") {
    await (0, mkdirp_1.default)(path_1.default.join(process.env.HOME, ".guerrillamail"));
    await fs_extra_1.default.writeFile(path_1.default.join(process.env.HOME, ".guerrillamail", filename), guerrillamail.toJSON());
    if (!json)
        logger.info("saved to ~/" + path_1.default.join(".guerrillamail", filename));
}
exports.saveSession = saveSession;
async function initSession() {
    const proxyOptions = await loadProxy();
    const guerrillamail = new guerrillamail_js_1.GuerrillaMail({ proxyOptions });
    logger.info("getting session");
    await saveSession(guerrillamail);
}
exports.initSession = initSession;
async function loadSession() {
    const proxyOptions = await loadProxy();
    const guerrillamail = guerrillamail_js_1.GuerrillaMail.fromJSON(await fs_extra_1.default.readFile(path_1.default.join(process.env.HOME, ".guerrillamail", "session.json")));
    guerrillamail.proxyOptions = proxyOptions;
    return guerrillamail;
}
exports.loadSession = loadSession;
const proxyStringToObject = (proxyUri) => {
    const parsed = url_1.default.parse(proxyUri);
    const [username, ...passwordParts] = (parsed.auth || "").split(":");
    return {
        type: parsed.protocol.replace(":", ""),
        hostname: parsed.hostname,
        port: parsed.port,
        userId: username || null,
        password: passwordParts.join(":") || null,
    };
};
const objectToProxyString = (o) => {
    return ((o.type === "socks" ? "socks5://" : o.type + "://") +
        (o.userId ? o.userId + ":" + o.password + "@" : "") +
        o.hostname +
        (o.port ? ":" + o.port : ""));
};
async function setProxy(proxyUri) {
    await (0, mkdirp_1.default)(path_1.default.join(process.env.HOME, ".guerrillamail"));
    const proxyOptions = proxyStringToObject(proxyUri);
    const joined = objectToProxyString(proxyOptions);
    await fs_extra_1.default.writeFile(path_1.default.join(process.env.HOME, ".guerrillamail", "proxy"), joined);
    logger.info("set-proxy: " + joined);
}
exports.setProxy = setProxy;
async function unsetProxy() {
    await (0, mkdirp_1.default)(path_1.default.join(process.env.HOME, ".guerrillamail"));
    await fs_extra_1.default.unlink(path_1.default.join(process.env.HOME, ".guerrillamail", "proxy"));
    logger.info("unset-proxy");
}
exports.unsetProxy = unsetProxy;
async function loadProxy() {
    await (0, mkdirp_1.default)(path_1.default.join(process.env.HOME, ".guerrillamail"));
    try {
        return proxyStringToObject(await fs_extra_1.default.readFile(path_1.default.join(process.env.HOME, ".guerrillamail", "proxy"), "utf8"));
    }
    catch (e) {
        return null;
    }
}
exports.loadProxy = loadProxy;
async function callAPI(command, data) {
    const guerrillamail = await loadSession();
    const camelCommand = (0, change_case_1.camelCase)(command);
    const json = data.j || data.json;
    const coerce = data.c || data.coerce;
    delete data.j;
    delete data.json;
    delete data.c;
    delete data.coerce;
    if (data.insecure)
        guerrillamail.insecure = true;
    delete data.insecure;
    if (!guerrillamail[camelCommand])
        throw Error("command not found: " + command);
    if (json)
        guerrillamail.logger = new Proxy({}, {
            get(v) {
                return () => { };
            },
        });
    const result = await guerrillamail[camelCommand](data);
    const coerced = coerce && typeof result.json === "function"
        ? await (async () => {
            const text = await result.text();
            try {
                return JSON.parse(text);
            }
            catch (e) {
                return text;
            }
        })()
        : result;
    if (json)
        console.log(JSON.stringify(coerced, null, 2));
    else
        logger.info(coerced);
    await saveSession(guerrillamail, json);
    return result;
}
exports.callAPI = callAPI;
async function saveSessionAs(name) {
    const guerrillamail = await loadSession();
    await saveSession(guerrillamail, false, name + ".json");
}
exports.saveSessionAs = saveSessionAs;
async function loadSessionFrom(name) {
    const guerrillamail = guerrillamail_js_1.GuerrillaMail.fromObject(JSON.parse(await fs_extra_1.default.readFile(path_1.default.join(process.env.HOME, ".guerrillamail", name), "utf8")));
    await saveSession(guerrillamail);
}
exports.loadSessionFrom = loadSessionFrom;
async function loadFiles(data) {
    const fields = [];
    for (let [k, v] of Object.entries(data)) {
        const parts = /(^.*)FromFile$/.exec(k);
        if (parts) {
            const key = parts[1];
            fields.push([key, await fs_extra_1.default.readFile(v)]);
        }
        else {
            fields.push([k, v]);
        }
    }
    return fields.reduce((r, [k, v]) => {
        r[k] = v;
        return r;
    }, {});
}
exports.loadFiles = loadFiles;
async function runCLI() {
    const [command, ...subquery] = yargs_1.default.argv._;
    const options = Object.assign({}, yargs_1.default.argv);
    delete options._;
    const data = await loadFiles(Object.entries(options).reduce((r, [k, v]) => {
        r[(0, change_case_1.camelCase)(k)] = String(v);
        return r;
    }, {}));
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
exports.runCLI = runCLI;
//# sourceMappingURL=cli.js.map