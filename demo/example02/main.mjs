import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";

let checkboxes = undefined;
const triggers = ["init", "navigation", "partialNavigation"];
const olderThan = new Date("2019-11-01").getTime();

smartable({

    callback: {

        initData: (tbl) => {
            checkboxes = tbl.html.table.querySelectorAll("caption input");
            tbl.data
                .filter(d => d.updated?.cmp > 0 && d.updated?.cmp < olderThan)
                .forEach(d => d.updated.cssClass.push("outdated"));
        },

        initRender: (tbl) => {
            checkboxes.forEach(cb => cb.addEventListener("change", () => {
                const checked = [...checkboxes].filter(cb => cb.checked).map(cb => cb.id);
                tbl.trigger.updateView({
                    colgrp: (checkboxes.length === checked.length)
                        ? ["all"]
                        : (checked.length ? checked : ["none"])
                });
            }));
            document.body.querySelector("header").removeAttribute("hidden");
        },

        preRender: (tbl) => {
            if (triggers.includes(tbl.render.trigger)) {
                const colgrp = Array.isArray(tbl.state.colgrp) ? tbl.state.colgrp : [];
                checkboxes.forEach(cb =>
                    cb.checked = (colgrp[0] === "all")
                        ? true
                        : colgrp.includes(cb.id)
                );
            }
        }
    }
});
