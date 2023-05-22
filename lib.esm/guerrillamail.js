import makeFetchCookie from "fetch-cookie";
import qs from "querystring";
import UserAgent from "user-agents";
import HttpsProxyAgent from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import https from "https";
import fetch from "node-fetch";
import url from "url";
const CookieJar = makeFetchCookie.toughCookie.CookieJar;
export class GuerrillaMail {
    jar;
    ip;
    userAgent;
    emailAddr;
    seq;
    proxyOptions;
    insecure;
    logger;
    constructor({ jar, userAgent, proxyOptions, insecure } = {}) {
        this.jar = jar ? CookieJar.deserializeSync(jar) : new CookieJar();
        this.ip = null;
        this.seq = 0;
        this.userAgent = userAgent || new UserAgent().toString();
        this.proxyOptions = proxyOptions || null;
        this.insecure = insecure || false;
    }
    _makeAgent() {
        const proxyOptions = this.proxyOptions || null;
        if (!proxyOptions) {
            if (!this.insecure)
                return null;
            return new https.Agent({ rejectUnauthorized: !this.insecure });
        }
        if (proxyOptions.type === "socks") {
            const opts = {
                ...proxyOptions,
            };
            delete opts.type;
            return new SocksProxyAgent(opts);
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
            return new HttpsProxyAgent({
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
        const fetchCookie = makeFetchCookie(fetch, this.jar);
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
        return await this._fetch(url.format({
            protocol: "https:",
            hostname: "api.guerrillamail.com",
            pathname: "ajax.php",
            search: "?" + qs.stringify({ f: methodName, ip: this.ip, agent: this.userAgent, ...data }),
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
//# sourceMappingURL=guerrillamail.js.map