import { readPreferences, usePreferences } from "@/lib/preferences";
import { vi } from "./vi";

type Vars = Record<string, string | number>;

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : text;

const lookup = (language: string, text: string, vars?: Vars) => fill(language === "vi" ? vi[text] ?? text : text, vars);

export const translate = (text: string, vars?: Vars) => lookup(readPreferences().language, text, vars);

export const localeOf = (language: string) => (language === "vi" ? "vi-VN" : "en-GB");

export const useT = () => {
  const { language } = usePreferences();
  const t = (text: string, vars?: Vars) => lookup(language, text, vars);
  return Object.assign(t, { language, locale: localeOf(language) });
};
