import { escapeInject } from "vike/server";

export default (pageContext: { urlPathname: string }) => escapeInject`page ${pageContext.urlPathname}`;
