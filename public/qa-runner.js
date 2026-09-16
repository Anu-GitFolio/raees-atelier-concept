const frame = document.querySelector("#subject"),
  out = document.querySelector("#results");
document.querySelector("#run").addEventListener("click", async () => {
  document.querySelector("#run").disabled = true;
  out.textContent = "Running…";
  const reports = [];
  for (const language of ["en", "ar"])
    for (const route of [
      "/",
      "/collection",
      "/product/zura-yaumi",
      "/finder",
      "/atelier",
      "/checkout",
      "/privacy",
    ]) {
      localStorage.setItem("raees-language", language);
      frame.src = route;
      await new Promise((resolve) => (frame.onload = resolve));
      await new Promise((resolve, reject) => {
        let tries = 0;
        const interval = setInterval(() => {
          if (frame.contentDocument.querySelector(".nav")) {
            clearInterval(interval);
            resolve();
          }
          if (++tries > 100) {
            clearInterval(interval);
            reject(new Error("Page did not load"));
          }
        }, 50);
      });
      const script = frame.contentDocument.createElement("script");
      script.src = "/axe.min.js";
      frame.contentDocument.head.append(script);
      await new Promise((resolve) => (script.onload = resolve));
      const result = await frame.contentWindow.axe.run(frame.contentDocument, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      });
      reports.push({
        language,
        route,
        overflow:
          frame.contentDocument.documentElement.scrollWidth > frame.clientWidth,
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      });
      out.textContent = JSON.stringify(reports, null, 2);
    }
  localStorage.setItem("raees-language", "en");
  document.querySelector("#run").disabled = false;
  out.textContent = "COMPLETE\n" + JSON.stringify(reports, null, 2);
});
document.querySelector("#responsive").addEventListener("click", async () => {
  document.querySelector("#responsive").disabled = true;
  const reports = [];
  out.textContent = "Running…";
  for (const language of ["en", "ar"])
    for (const width of [320, 360, 390, 768, 1024, 1440])
      for (const route of [
        "/",
        "/collection",
        "/product/zura-yaumi",
        "/finder",
        "/checkout",
      ]) {
        localStorage.setItem("raees-language", language);
        frame.width = width;
        frame.src = route;
        await new Promise((resolve) => (frame.onload = resolve));
        await new Promise((resolve) => {
          const t = setInterval(() => {
            if (frame.contentDocument.querySelector(".nav")) {
              clearInterval(t);
              resolve();
            }
          }, 30);
        });
        const doc = frame.contentDocument;
        for (const scale of [1, 2]) {
          doc.documentElement.style.fontSize = 16 * scale + "px";
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const overflow = doc.documentElement.scrollWidth > frame.clientWidth;
          const bad = overflow
            ? [...doc.querySelectorAll("body *")]
                .filter((el) => {
                  const r = el.getBoundingClientRect();
                  return (
                    r.width > 0 &&
                    (r.right > frame.clientWidth + 1 || r.left < -1) &&
                    !el.closest(".category-inner")
                  );
                })
                .slice(0, 6)
                .map((el) => el.className || el.tagName)
            : [];
          const brand = doc
              .querySelector(".nav > .brand")
              ?.getBoundingClientRect(),
            tools = doc.querySelector(".nav-tools")?.getBoundingClientRect();
          const overlap =
            brand &&
            tools &&
            brand.left < tools.right &&
            tools.left < brand.right &&
            brand.top < tools.bottom &&
            tools.top < brand.bottom;
          reports.push({
            language,
            width,
            route,
            textScale: scale,
            font: frame.contentWindow.getComputedStyle(doc.documentElement)
              .fontSize,
            overflow,
            overlap: !!overlap,
            elements: bad,
          });
        }
        out.textContent = JSON.stringify(
          {
            checked: reports.length,
            fontSizes: [...new Set(reports.map((r) => r.font))],
            failures: reports.filter((r) => r.overflow || r.overlap),
          },
          null,
          2,
        );
      }
  localStorage.setItem("raees-language", "en");
  document.querySelector("#responsive").disabled = false;
  out.textContent =
    "COMPLETE\n" +
    JSON.stringify(
      {
        checked: reports.length,
        fontSizes: [...new Set(reports.map((r) => r.font))],
        failures: reports.filter((r) => r.overflow || r.overlap),
      },
      null,
      2,
    );
});
