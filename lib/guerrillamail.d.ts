/// <reference types="node" />
import { SocksProxyAgent } from "socks-proxy-agent";
import { getLogger } from "./logger.js";
import https from "https";
declare const CookieJar: any;
export declare class GuerrillaMail {
    jar: typeof CookieJar;
    ip: any;
    userAgent: any;
    emailAddr: string;
    seq: number;
    proxyOptions: any;
    insecure: boolean;
    logger: ReturnType<typeof getLogger>;
    constructor({ jar, userAgent, proxyOptions, insecure }?: any);
    _makeAgent(): https.Agent | SocksProxyAgent;
    toObject(): {
        ip: any;
        jar: any;
        userAgent: any;
    };
    static fromObject({ ip, jar, userAgent }: any): GuerrillaMail;
    toJSON(): string;
    static fromJSON(s: string): GuerrillaMail;
    getEmailList({ offset, seq }?: any): Promise<any>;
    extend(): Promise<any>;
    forgetMe({ emailAddr }?: any): Promise<any>;
    delEmail({ emailIds }: {
        emailIds: number[];
    }): Promise<any>;
    _fetch(method: any, config?: any): Promise<any>;
    checkIp(): Promise<any>;
    _call(methodName: any, data: any): Promise<any>;
    setEmailUser({ emailUser, lang }: {
        emailUser: any;
        lang: any;
    }): Promise<any>;
    fetchEmail({ emailId }: {
        emailId: any;
    }): Promise<any>;
    getEmailAddress(): Promise<any>;
    checkEmail({ seq }: {
        seq: any;
    }): Promise<any>;
}
export {};
