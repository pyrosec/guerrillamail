declare const CookieJar: any;
export declare class GuerrillaSession {
    jar: typeof CookieJar;
    ip: any;
    userAgent: any;
    emailAddr: string;
    seq: number;
    constructor();
    getEmailList({ offset, seq }?: any): Promise<any>;
    extend(): Promise<any>;
    forgetMe({ emailAddr }?: any): Promise<any>;
    delEmail({ emailIds }: {
        emailIds: number[];
    }): Promise<any>;
    _fetch(method: any, config?: any): Promise<Response>;
    checkIp(): Promise<string>;
    _call(methodName: any, data: any): Promise<Response>;
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
