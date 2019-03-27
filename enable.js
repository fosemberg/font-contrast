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

function getLightness(luma) 
{
    let lightness = luma / 255;

    lightness = parseFloat(lightness.toFixed(2));

    return lightness;
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

function createElem() {
    const doc = document;

    x = doc.createElement("style");
    doc.head.appendChild(x);

    x.setAttribute("id", "_fc_");

    t = doc.createTextNode("");
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

    return `
    ${dimStr}
    ${opacityStr}
    ${sizeStr}
    ${boldStr}
    ${plhdrStr}
    ${borderStr}
    ${underlineStr}
    `;
}

function containsText(node) {
    //stackoverflow.com/a/27011142
    return Array.prototype.some.call(node.childNodes, (child) => {
        return child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue);
    });
}

function init() 
{
    if(document.getElementById("_fc_")) 
    {
        x.appendChild(t);
        return;
    }

    createElem();

    const doc = document;

    let init = (items) => {
  
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

        let tagsToSkip = ["SCRIPT", "LINK", "SECTION", "STYLE", "IMG", "VIDEO", "SOURCE"];
        const colorsToSkip = ["rgb(0, 0, 0)", "", "rgba(0, 0, 0, 0)", ""];

        if(skipHeadings)
        {  
            tagsToSkip = tagsToSkip.concat(["H1", "H2", "H3"]);
        }

        const transparent = colorsToSkip[2];

        let filterNodes = (nodes) => {

            nodes = nodes.filter(node => { return !tagsToSkip.includes(String(node.nodeName)) });
            //nodes = nodes.filter(containsText);  //We can't add form borders if we do this now

            /* Temporary url exceptions */
            switch(url)
            {
                case "youtube.com": {
                    //Filters youtube player. It doesn't get dimmed anyways, but it's to make sure it stays untouched by the one offset I have for now.
                    nodes = nodes.filter(node => {return !String(node.className).startsWith("ytp")});
                    break;
                }
                case "genius.com": {
                    //nodes = nodes.filter(node => node.className !== "home_featured_story-date"); 
                    break;
                }
            }
        
            return nodes;
        };

        let getBgLuma = (bgColor, parent) => {

            let bgLuma = 236; //assume light-ish color if we can't find it

            while (bgColor === transparent && parent)
            {
                if(parent instanceof Element) 
                {
                    bgColor = getComputedStyle(parent, null).getPropertyValue("background-color");
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
            let css = "";
        
            /* Debugging */
            let dbArr = [];
            let dbValues = 0;
            let dbTime = 1;

            let dbTimeStr = `Process ${callCount++} time`;
            if(dbTime) console.time(dbTimeStr);
  
            nodes = filterNodes(nodes);

            let elemsToSkip = [];

            for(let i = 0, len = nodes.length; i < len; ++i)
            {
                let node   = nodes[i];
                let tag    = String(node.nodeName); 
                let classe = String(node.className);

                if(outline)
                {
                    if(tag === "INPUT" && node.type !== "submit") node.setAttribute("b__", "");
                }
                
                let style = getComputedStyle(node);

                let bgImage = style.getPropertyValue("background-image");

                if(bgImage !== "none") 
                {            
                    elemsToSkip = nlToArr(node.getElementsByTagName("*"));
                }

                if(elemsToSkip.includes(node)) continue;

                if(!containsText(node)) continue;

                if(size > 0) 
                {
                    let size = style.getPropertyValue("font-size");
                    size = parseInt(size);    
        
                    if(size < sizeLimit) 
                    {
                        node.setAttribute("s__", size); 
                    } 
                }
        
                let color = style.getPropertyValue("color");
        
                if(colorsToSkip.includes(color)) continue;
        
                let bgColor = style.getPropertyValue("background-color");
                let bgLuma = getBgLuma(bgColor, node.parentNode);
                let minBgLuma = 160 - strength; 

                let luma = calcLuma(color);
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
                        continue;
                    }
                }

                if(bgLuma < minBgLuma) continue;

                if(advDimming)
                {
                    let greyOffset = 0;
                    if(colorfulness <= 32) greyOffset = 32;
        
                    let amount = -strength - greyOffset - contrast / 6;

                    css += `[d__="${++advDimmingCount}"]{color:${adjustBrightness(color, amount)}!important}\n`;
                }
        
               node.setAttribute("d__", advDimmingCount);
            }
        
            if(dbTime) console.timeEnd(dbTimeStr);     
            if(dbValues) console.table(dbArr);
        
            return css;
        };

        let css = "";

        css += process(nodes);
        css += buildCSS(advDimming, forceOpacity, boldText, forcePlhdr, size, sizeLimit)

        t.nodeValue = css;

        let callback = (mutationsList) => {

            let newRules = "";

            mutationsList.forEach((mutation) => {
                if(mutation.addedNodes && mutation.addedNodes.length > 0)
                {           
                    for(let i = 0, len = mutation.addedNodes.length; i < len; ++i)
                    {
                        const node = mutation.addedNodes[i];

                        if(node instanceof HTMLElement)
                        {
                            let children = [];

                            children = nlToArr(node.getElementsByTagName("*")); 
                            
                            children.push(node);

                            if(advDimming) 
                            {
                                newRules += process(children);
                            }
                            else process(children);
                        }
                    }
                }
            });

            if(advDimming && newRules.length > 0)
            {
                css += newRules;
                t.nodeValue = css;
            }
        };

        new MutationObserver(callback).observe(doc.body, {childList: true, subtree: true});

        x.appendChild(t);
    };

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

    browser.storage.local.get(stored, init);
}

init();

chrome.runtime.sendMessage({from: "yo", t: true});