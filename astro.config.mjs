import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const rawBase = (process.env.ASTRO_BASE ?? "/").trim();
const strippedBase = rawBase.replace(/^\/+|\/+$/g, "");
const normalizedBase = strippedBase ? `/${strippedBase}/` : "/";

export default defineConfig({
  site: process.env.ASTRO_SITE ?? "https://nbrian96.github.io",
  base: normalizedBase,
  output: "static",
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
  integrations: [mdx(), react()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [
          rehypeKatex,
          {
            strict: false,
            macros: {
              "\\dollar": "\\$",
            },
          },
        ],
      ],
    }),
  },
});
