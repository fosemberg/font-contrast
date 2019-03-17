//Disable.js
//Fushko

function disable() {
    let css = t.nodeValue;

    css = css.replace(/rgb/g, "_x_");
    css = css.replace(/black/, "_xxx_");

    css = css.replace(/opacity:1/, "_o_");

    t.nodeValue = css;
}

//disable();

x.removeChild(t);
chrome.runtime.sendMessage({from: "yo", t: false});