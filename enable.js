/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

"use strict";
var x, t;

function getRGBarr(rgbString) 
{
    let colors = rgbString.split(")");
    colors = colors[0].split("(");
    colors = colors[1].split(",");

    colors[0] = parseFloat(colors[0]);
    colors[1] = parseFloat(colors[1]);
    colors[2] = parseFloat(colors[2]);

    return colors;
}

function calcLuma(rgbString) 
{
    let colors = getRGBarr(rgbString);

    let r = colors[0];
    let g = colors[1];
    let b = colors[2];

    /* sRGB Luma gives more weight to green, as we perceive it to be lighter than other colors.
     * itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.709-6-201506-I!!PDF-E.pdf */
    let luma = r * 0.2126 + g * 0.7152 + b * 0.0722; 

    luma = +luma.toFixed(1);
    
    return luma;
}

function calcColorfulness(rgbString) 
{
    let colors = getRGBarr(rgbString);

    let r, g, b;
    r = colors[0];
    g = colors[1];
    b = colors[2];

    let colorfulness = Math.abs(r-g);
    colorfulness += Math.abs(g-b);

    return colorfulness;
}

function adjustBrightness(rgbStr, amount)
{
    let colors = getRGBarr(rgbStr);

    for (let i = 0; i < 3; ++i)
    {
        let col = colors[i];

        col += amount;
        col = parseInt(col);

        if (col > 255) col = 255;
        else if (col < 0) col = 0;

        colors[i] = col;
    }
    
    let newStr = `rgb(${colors[0]}, ${colors[1]}, ${colors[2]})`;

    return newStr;
}

function buildCSS(advDimming, forceOpacity, boldText, forcePlhdr, size, sizeLimit)
{
    let dimStr = "", opacityStr = "", boldStr = "", forceBlack = "", sizeStr = "", underlineStr = "";

    underlineStr = "[u__]{text-decoration:underline!important}";

    if(!advDimming) 
    {
        dimStr = "[d__],[d__][style]{color:black!important}";
    }

    if(forceOpacity) 
    {
        opacityStr = "*,*[style]{opacity:1!important}"
    }
    
    if(boldText) 
    {
        boldStr = "*{font-weight:bold!important}";
    }
    
    if(forcePlhdr) 
    {
        forceBlack = "color:black!important";
    }

    let plhdrStr = `::placeholder{opacity:1!important;${forceBlack}}`;

    if(size > 0) 
    {
        let i = 1;
        
        while(i <= sizeLimit) //threshold
        {
            sizeStr += `[s__="${i}"]{font-size: calc(${i++}px + ${size}%)!important}\n`;
        }
    }

    let borderStr = "[b__]{border:1px solid black!important}"; //Doesn't hurt to put it in, even if form borders are disabled

    return `${dimStr}${opacityStr}${sizeStr}${boldStr}${plhdrStr}${borderStr}${underlineStr}`;
}

function containsText(node) {
    //stackoverflow.com/a/27011142
    return Array.some(node.childNodes, (child) => {
        return child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue);
    });
}

function start(items) 
{
    let {whitelist, globalStr: strength, size, sizeLimit, skipHeadings, skipColoreds: avoidReadable, advDimming, outline, boldText, forcePlhdr, forceOpacity, smoothEnabled} = items;

    let url = extractRootDomain(String(window.location));

    if(whitelist) 
    {
        let idx = whitelist.findIndex(o => o.url === url);

        if(idx > -1) 
        {
            let wlItem = whitelist[idx];

            strength     = wlItem.strength;
            size         = wlItem.size;
            sizeLimit    = wlItem.threshold;
            skipHeadings = wlItem.skipHeadings;
            avoidReadable = wlItem.skipColoreds; 
            advDimming   = wlItem.advDimming;
            outline      = wlItem.outline;
            boldText     = wlItem.boldText;
            forcePlhdr   = wlItem.forcePlhdr;
            forceOpacity = wlItem.forceOpacity;
        }
    }

    if(smoothEnabled)
    {
        const doc = document;
        let y = doc.createElement("style");
        doc.head.appendChild(y);
        y.setAttribute("id", "_fct_");

        let smoothSize;
        size > 0 ? smoothSize = " font-size" : "";

        let z = doc.createTextNode(`[d__],[d__][style*]{
            transition: color,${smoothSize} .25s linear!important;
        }`);

        y.appendChild(z);
    }

    let nodes = [];

    nodes = nlToArr(document.body.getElementsByTagName("*"));

    let tagsToSkip = ["SCRIPT", "LINK", "STYLE", "IMG", "VIDEO", "SOURCE", "CANVAS"];
    const colorsToSkip = ["rgb(0, 0, 0)", "", "rgba(0, 0, 0, 0)", ""];
    const transparent = colorsToSkip[2];

    let procImg = true;

    let applyExceptions = (nodes) => 
    {
        /* Temporary url exceptions */
        switch(url)
        {
            case "youtube.com": {
                //Filters youtube player. It doesn't get dimmed anyways, but it's to make sure it stays untouched by the one offset I have for now.
                nodes = nodes.filter(node => {return !String(node.className).startsWith("ytp")});
                procImg = false;
                break;
            }
            case "facebook.com": {
                colorsToSkip[1] = "rgb(255, 255, 255)";
                procImg = false;
                break;
            }
        }
    
        return nodes;
    };

    let getBgLuma = (parent, bgColor) =>
    {
        let bgLuma = 236; //assume light-ish color if we can't find it

        while (bgColor === transparent && parent)
        {
            if(parent instanceof Element) 
            {
                bgColor = getComputedStyle(parent).getPropertyValue("background-color");
            }

            parent = parent.parentNode;
        }
    
        if(bgColor !== transparent) 
        {
            bgLuma = calcLuma(bgColor);
    
            if(bgLuma < 48 && bgColor.startsWith("rgba")) 
            {
                /*The background color can sometimes be an rgba string such as: 'rgba(0, 0, 0, 0.01)', so we need to account for it. 
                 *This can provide OK results with the strength slider. @TODO: Less naive method.*/
                bgLuma += 127; 
            }
        }
    
        return bgLuma;
    }

    let callCount = 0
    let advDimmingCount = 0;

    let process = (nodes) =>
    {
        /* Debugging */
        let dbArr = [];
        let dbValues = 0;
        let dbTime = 0;
        let dbTimeStr = `Process ${callCount++} time`;
        if(dbTime) console.time(dbTimeStr);
        /********* */

        if(skipHeadings)
        {  
            tagsToSkip = tagsToSkip.concat(["H1", "H2", "H3"]);
        }

        let nodesToSkip = [];

        nodes = applyExceptions(nodes);

        let dimNode = (node, callback) => {
            let tag = String(node.nodeName);
            if(tagsToSkip.includes(tag)) return;

            let classe = String(node.className);

            let style = getComputedStyle(node);
            
            if(procImg) 
            {
                if(style.getPropertyValue("background-image") !== "none") //Skip all descendants
                {            
                    nodesToSkip = nodesToSkip.concat(nlToArr(node.getElementsByTagName("*")));
                    return;
                }

                if(nodesToSkip.includes(node)) return;
            }
           
            if(outline && node.nodeName === "INPUT" && node.type !== "submit") node.setAttribute("b__", "");

            if(!containsText(node)) return;
    
            let color = style.getPropertyValue("color");
            if(colorsToSkip.includes(color)) return;

            let bgColor      = style.getPropertyValue("background-color");
            let bgLuma       = getBgLuma(node.parentNode, bgColor);
            let luma         = calcLuma(color);
            let colorfulness = calcColorfulness(color);

            let debugObj = {};
    
            if(dbValues)
            {
                debugObj = {
                    tag,
                    classe,
                    //luma,
                    //bgLuma,
                    //colorfulness,
                    //minBgLuma,
                };
    
                dbArr.push(debugObj);
            }

            if(bgLuma < 160 - strength) return;

            let contrast = Math.abs(bgLuma - luma);
            contrast = +contrast.toFixed(2);
           
            if(avoidReadable)
            { 
                let minContrast     = 132 + (strength / 2);
                let minLinkContrast = 96 + (strength / 3); 
                let minColorfulness = 32;
    
                if(dbValues) Object.assign(debugObj, {contrast, minContrast, minLinkContrast});
    
                if(tag === "A")
                {
                    minContrast = minLinkContrast;
                }
    
                if(contrast > minContrast && colorfulness > minColorfulness)
                {
                    return;
                }
            }

            if(advDimming)
            {
                let greyOffset = 0;
                if(colorfulness <= 32) greyOffset = 32;
    
                let amount = -strength - greyOffset - contrast / 6;

                callback(`[d__='${++advDimmingCount}']{color:${adjustBrightness(color, amount)}!important}`);
            }

           node.setAttribute("d__", advDimmingCount);

           if(size)
           {
               let size = style.getPropertyValue("font-size");
               size = parseInt(size);    
   
               if(size < sizeLimit) 
               {
                   node.setAttribute("s__", size); 
               } 
           }

        };

        //https://stackoverflow.com/a/10344560
        function processLargeArray(arr) 
        {
            let chunk = 200;
            let idx = 0;
            let len = arr.length;
            let buf = [];

            let doChunk = () => {
                let count = chunk;

                while (count-- && idx < len) 
                {
                    dimNode(arr[idx++], cssStr => buf.push(cssStr));
                }

                if(advDimming && buf.length > 0) t.nodeValue += buf.join('');

                if(idx < len) setTimeout(doChunk, 0);
            };

            doChunk();    
        }

        processLargeArray(nodes);

        if(dbTime) console.timeEnd(dbTimeStr);
        if(dbValues) console.table(dbArr);
    }

    let css = buildCSS(advDimming, forceOpacity, boldText, forcePlhdr, size, sizeLimit);
    t.nodeValue = css;

    process(nodes);

    ///////////////////////////////////////////////////////////////////////////////////New elements

    let callback = (mutationsList) => {
        mutationsList.forEach((mutation) => {
            if(mutation.addedNodes.length > 0) 
            {
                for(let node of mutation.addedNodes)
                {
                    if(node instanceof Element)
                    {
                        let nodes = Array.from(node.getElementsByTagName("*"));
                        nodes.push(node);
                 
                        process(nodes);
                    }
                }
            }
        });
    };

    new MutationObserver(callback).observe(document.body, {childList: true, subtree: true});

    x.appendChild(t);
};

function init() 
{
    if(document.getElementById("_fc_")) 
    {
        x.appendChild(t);
        return;
    }

    createElem();

    let stored = [
        "whitelist", 
        //"blacklist", 
        "globalStr",
        "size",
        "sizeThreshold", 
        "skipColoreds", 
        "skipHeadings", 
        "advDimming", 
        "boldText", 
        "forceOpacity",
        "forcePlhdr",
        "smoothEnabled"
    ];

    browser.storage.local.get(stored, start);
}

init();

chrome.runtime.sendMessage({from: "yo", t: true});

function createElem() 
{
    const doc = document;

    x = doc.createElement("style");
    doc.head.appendChild(x);

    x.setAttribute("id", "_fc_");

    t = doc.createTextNode("");
}

function extractHostname(url) {
    let hostname;

    //Find and remove protocol (http, ftp, etc.) and get hostname
    if(url.indexOf("://") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }
  
    //Find and remove port number
    hostname = hostname.split(':')[0];

    //Find and remove "?"
    hostname = hostname.split('?')[0];
    hostname = hostname.replace('www.', '');

    return hostname;
}

function extractRootDomain(url) 
{
    let domain = extractHostname(url);
    let splitArr = domain.split('.');
    let arrLen = splitArr.length;

    //Check if there is a subdomain
    if(arrLen > 2)
    {
        domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
        
        //Check if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
        if (splitArr[arrLen - 1].length === 2 && splitArr[arrLen - 1].length === 2) 
        {
            domain = splitArr[arrLen - 3] + '.' + domain;
        }
    }
    return domain;
}

function nlToArr(nl)
{
    let arr = [];

    for (let i = 0, len = arr.length = nl.length; i < len; ++i) arr[i] = nl[i];

    return arr;
}