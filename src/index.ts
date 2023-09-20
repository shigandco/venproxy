import { Router, createCors, error, html } from "itty-router";

const router = Router();
const { preflight, corsify } = createCors({
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  maxAge: 86400,
});

router.all("*", preflight);

router.get("/vencord.css", async () => {
  const cssResponse = await fetch(
    "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css"
  ).then((res) => res.text());
  return new Response(cssResponse, {
    headers: {
      "Content-Type": "text/css",
    },
  });
});

router.get("/vencord.js", async () => {
  const jsResponse = await fetch(
    "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.js"
  ).then((res) => res.text());
  return new Response(jsResponse, {
    headers: {
      "Content-Type": "text/javascript",
    },
  });
});

router.all("*", async (req: Request) => {
  const config: any = {
    method: req.method,
    headers: {},
  };

  if (req.method === "POST") {
    const body = await req.text();
    config.body = body;
    config.headers["Content-Type"] = req.headers.get("Content-Type");
  }
  if (req.headers.get("Authorization")) {
    config.headers["Authorization"] = req.headers.get("Authorization");
  }
  let url = `https://canary.discord.com${new URL(req.url).pathname}`;
  if (req.url.includes("?")) {
    url += `?${new URL(req.url).searchParams.toString()}`;
  }
  const response = await fetch(url, {
    ...config,
  });

  let body = await response.text();

  body = body.replaceAll("//canary.discord.com", "");

  if (response.headers.get("Content-Type")?.includes("text/html")) {
    const rewriter = new HTMLRewriter().on("head", {
      async element(element) {
        element.prepend(
          `<script src="/vencord.js"></script>
          <link href="/vencord.css" rel="stylesheet"/>`,
          {
            html: true,
          }
        );
      },
    });

    body = await rewriter.transform(new Response(body)).text();
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "text/plain",
    },
  });
});

export default {
  fetch: (req: Request) => router.handle(req).then(corsify).catch(error),
  port: 8080,
};
