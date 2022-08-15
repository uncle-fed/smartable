function badBrowser() {
    document.getElementsByTagName("body")[0].innerHTML = "<p id=\"error\">Something went terribly wrong.<br />Oh, never mind, it's just your web browser's ancient version.</p>";
}

if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
    badBrowser();
} else {
    document.addEventListener("DOMContentLoaded", badBrowser);
}
