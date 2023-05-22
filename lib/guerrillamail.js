"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuerrillaMail = void 0;
const fetch_cookie_1 = __importDefault(require("fetch-cookie"));
const querystring_1 = __importDefault(require("querystring"));
const user_agents_1 = __importDefault(require("user-agents"));
const https_proxy_agent_1 = __importDefault(require("https-proxy-agent"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
const https_1 = __importDefault(require("https"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const url_1 = __importDefault(require("url"));
const CookieJar = fetch_cookie_1.default.toughCookie.CookieJar;
class GuerrillaMail {
    constructor({ jar, userAgent, proxyOptions, insecure } = {}) {
        this.jar = jar ? CookieJar.deserializeSync(jar) : new CookieJar();
        this.ip = null;
        this.seq = 0;
        this.userAgent = userAgent || new user_agents_1.default().toString();
        this.proxyOptions = proxyOptions || null;
        this.insecure = insecure || false;
    }
    _makeAgent() {
        const proxyOptions = this.proxyOptions || null;
        if (!proxyOptions) {
            if (!this.insecure)
                return null;
            return new https_1.default.Agent({ rejectUnauthorized: !this.insecure });
        }
        if (proxyOptions.type === "socks") {
            const opts = {
                ...proxyOptions,
            };
            delete opts.type;
            return new socks_proxy_agent_1.SocksProxyAgent(opts);
        }
        else if (proxyOptions.type === "http" || this.insecure) {
            const proxyParams = {
                host: proxyOptions.hostname,
                port: proxyOptions.port,
                auth: (proxyOptions.userId &&
                    proxyOptions.password &&
                    proxyOptions.userId + ":" + proxyOptions.password) ||
                    null,
            };
            return new https_proxy_agent_1.default({
                ...proxyParams,
                secure: true,
                https: true,
                rejectUnauthorized: !this.insecure,
            });
        }
        else
            return null;
    }
    toObject() {
        return {
            ip: this.ip,
            jar: this.jar.serializeSync(),
            userAgent: this.userAgent
        };
    }
    static fromObject({ ip, jar, userAgent }) {
        return new GuerrillaMail({
            jar,
            ip,
            userAgent
        });
    }
    toJSON() {
        return JSON.stringify(this.toObject(), null, 2);
    }
    static fromJSON(s) {
        return this.fromObject(JSON.parse(s));
    }
    async getEmailList({ offset, seq } = {}) {
        return await (await this._call('get_email_list', { offset: offset || 0, seq: seq || this.seq || 0 })).json();
    }
    async extend() {
        return await (await this._call('extend', {})).json();
    }
    async forgetMe({ emailAddr } = {}) {
        return await (await this._call('forget_me', { email_addr: emailAddr || this.emailAddr })).json();
    }
    async delEmail({ emailIds }) {
        const [first, ...rest] = emailIds.map((v) => 'email_ids[]=' + String(v)).join('&').split('=');
        return await (await this._call('del_email', { first: rest.join('=') })).json();
    }
    async _fetch(method, config = {}) {
        const fetchCookie = (0, fetch_cookie_1.default)(node_fetch_1.default, this.jar);
        config.headers = config.headers || {};
        config.headers["user-agent"] = this.userAgent;
        const agent = config.agent || this._makeAgent();
        config.agent = agent;
        return (await fetchCookie(method, config));
    }
    async checkIp() {
        const ip = await (await this._fetch("https://api64.ipify.org", { method: "GET" })).text();
        this.ip = ip;
        return ip;
    }
    async _call(methodName, data) {
        return await this._fetch(url_1.default.format({
            protocol: "https:",
            hostname: "api.guerrillamail.com",
            pathname: "ajax.php",
            search: "?" + querystring_1.default.stringify({ f: methodName, ip: this.ip, agent: this.userAgent, ...data }),
        }), { method: "POST" });
    }
    async setEmailUser({ emailUser, lang }) {
        return await (await this._call('set_email_user', { email_user: emailUser, lang })).json();
    }
    async fetchEmail({ emailId }) {
        return await (await this._call('fetch_email', { email_id: emailId })).json();
    }
    async getEmailAddress() {
        const response = await this._call("get_email_address", {});
        const data = await response.json();
        this.emailAddr = data.email_addr;
        return data;
    }
    async checkEmail({ seq }) {
        const response = await (await this._call("check_email", { seq: seq == null ? this.seq : seq })).json();
        return response;
        //const { list } = {list: {mailer: "X"}} // jsonResponse;
        // console.log("checking mail: ", list);
        //const verificationEmail = list.find((email: any) => email.mail_subject === "Signup - coinsbee.com");
        //   if (verificationEmail) {
        //   const regex = /https:\/\/www\.coinsbee\.com\/en\/signup&id=\d+&hash=[a-zA-Z0-9]+/;
        // const verificationLink = verificationEmail.mail_body.match(regex);
        //if (verificationLink) {
        //return verificationLink[0];
        //}
        //}
    }
}
exports.GuerrillaMail = GuerrillaMail;
//# sourceMappingURL=guerrillamail.js.map