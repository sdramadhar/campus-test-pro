import * as cookieParserModule from "cookie-parser";
import { RequestHandler } from "express";

type CookieParserFactory = (() => RequestHandler) & {
  default?: () => RequestHandler;
};

export function createCookieParser(): RequestHandler {
  const factory = cookieParserModule as unknown as CookieParserFactory;
  return (factory.default ?? factory)();
}
