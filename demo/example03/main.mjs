import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";

smartable({
    source: {
        male: "src_male.yml",
        female: "src_female.yml"
    },
    callback: {
        initData: customInitData,
        initRender: customInitRender,
        preRender: customPreRender,
        postRender: customPostRender
    },
    converter: customDataConverter
});


const olderThan = new Date("2019-11-01").getTime();
const html = {};


function customDataConverter(raw, data) {
    let id = 1;
    for (const [gender, obj] of Object.entries(raw)) {
        for (const [guid, values] of Object.entries(obj)) {
            data.push({...{id: id++, guid, gender}, ...values});
        }
    }
}


function customInitData(tbl) {

    html.caption = tbl.html.table.querySelector("caption");
    html.var = html.caption.querySelector("var");

    html.caption.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", (event) => {
            tbl.trigger.updateView({view: event.target.value});
        })
    });

    tbl.data
        .filter(d => d.updated?.type !== "Date" || d.updated?.cmp < olderThan)
        .forEach(d => d._row.cssClass.push("outdated"));
}


function customInitRender(tbl) {
    document.body.querySelector("header").removeAttribute("hidden");
}


function customPreRender(tbl) {
    html.caption.querySelector("button.selected")?.classList.remove("selected");
    html.caption.querySelector("button[value='" + (tbl.state.view || "") +"']")?.classList.add("selected");
}


function customPostRender(tbl) {
    console.log(tbl);
    html.var.innerHTML = tbl.render.rowsCount;
}
