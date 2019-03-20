/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

//"use strict";
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

    luma = parseFloat(luma.toFixed(1));
    
    return luma;
}

function calcLightness(luma) 
{
    lightness = luma / 255;

    lightness = parseFloat(lightness.toFixed(2));

    return lightness; //> .6 is light
}

function calcDelta(rgbString) {
    let colors = getRGBarr(rgbString);

    let r, g, b;
    r = colors[0];
    g = colors[1];
    b = colors[2];

    let delta = 0;

    delta += Math.abs(r-g);
    delta += Math.abs(g-b);

    return delta;
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

function containsText(node) {
    //stackoverflow.com/a/27011142
    return Array.prototype.some.call(node.childNodes, (child) => {
        return child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue);
    });
}

function nodeListToArr(nl)
{
    let arr = [];

    for (let i = 0, len = arr.length = nl.length; i < len; ++i) arr[i] = nl[i];

    return arr;
}

function adjustBrightness(rgbStr, str)
{
    let colors = getRGBarr(rgbStr);

    for (let i = 0; i < 3; ++i)
    {
        let col = colors[i];

        col -= str;

        if (col > 255) col = 255;
        else if (col < 0) col = 0;

        colors[i] = col;
	}
    
    let newStr = `rgb(${colors[0]}, ${colors[1]}, ${colors[2]})`;

    return newStr;
}

function process(nodes, settings)
{
    if(typeof this.c === "undefined") this.c = 0;

    const black = "rgb(0, 0, 0)", white = "rgb(255, 255, 255)", transparent = "rgba(0, 0, 0, 0)";
    let tagsToSkip = ["script", "link", "meta", "style", "img", "video", "#comment"];
    const classesToSkip = ["home_featured_story-date"]; //genius
    const headings = ["h1", "h2", "h3"];

    let css = "";

    if(settings.skipHeadings)
    {  
        tagsToSkip = tagsToSkip.concat(headings);
    }

    let db = true; //debug
    let dbArr = [];

    for(let i = 0, len = nodes.length; i < len; ++i)
    {
        let node = nodes[i];

        let debugObj = {};

        dbArr.push(debugObj);

        let tag = String(node.localName), classe = String(node.className), id = String(node.id);

        if(settings.outline && tag === "input" && node.type != "submit") 
        {
            node.setAttribute("b__", "");
        }
    
        if(!containsText(node) || !tag || ~tagsToSkip.indexOf(tag) || classe.startsWith("ytp") || ~classesToSkip.indexOf(classe)) continue;
     
        let style   = getComputedStyle(node, null);

        let color   = style.getPropertyValue("color");
        let bgColor = style.getPropertyValue("background-color");
        let size    = style.getPropertyValue("font-size");

        size = parseInt(size);

        if(settings.size > 0) 
        {
            if(size < settings.sizeLimit) 
            {
                node.setAttribute("s__", size); 
            } 
        }

        if(color === black || color === white || color === transparent) continue;

        let colorfulness = calcDelta(color);

        dbArr[i].colorfulness = colorfulness;
        
        let parent = node.parentNode;

        while (bgColor === transparent && parent)
        {
            if(parent instanceof HTMLElement) 
            {
                bgColor = getComputedStyle(parent, null).getPropertyValue("background-color");
            }
    
            parent = parent.parentNode;
        }

        let bgLuma;
    
        if(bgColor === transparent) 
        {
            bgLuma = 236; //@TODO: Figure out how to approximate color in this case (if there is a way). We assume a light color for now.
        }
        else
        {
            bgLuma = calcLuma(bgColor);

            if(bgLuma < 48 && bgColor.startsWith("rgba")) 
            {
                //The background color can sometimes be an rgba string such as: 'rgba(0, 0, 0, 0.01)', so we need to account for it. 
                
                bgLuma += 127; //This can provide OK results with the strength slider. @TODO: Less naive method.
            }
        }
    
        let luma        = calcLuma(color);
        let lightness   = calcLightness(luma);
        let bgLightness = calcLightness(bgLuma);

        /*
        @TODO: Decide what to do with skipColoreds, now that it's a bit redundant with the better algorithm

        if(settings.skipColoreds)
        {
            let offset = 0;

            if(tag === "a") 
            {
                offset = -32; 
            }

            let val = 32 + settings.str + offset;

            if(colorfulness-luma > val) continue;
        }
        */

        let isGrey     = colorfulness < 18; //@TODO: Make these values adjustable
        let isReadable = lightness < 0.45;
        let isBgDarker = bgLightness < lightness;

        /*Logging*/
        //dbArr[i].tag          = tag;
        //dbArr[i].title        = node.title;
        //dbArr[i].class        = classe;
        //dbArr[i].color        = color;
        //dbArr[i].bgColor      = bgColor;
        //dbArr[i].size         = size;
        //dbArr[i].luma         = luma;
        //dbArr[i].bgLuma       = bgLuma;
        dbArr[i].lightness    = lightness;
        dbArr[i].bgLightness  = bgLightness;
        dbArr[i].isBgDarker   = isBgDarker;
        dbArr[i].isReadable   = isReadable;
        dbArr[i].isGrey       = isGrey;
        /********/

        if(!isGrey && isReadable || isBgDarker) continue;

        if(settings.advDimming)
        {
            let greyOffset = 16;
            greyOffset -= colorfulness;
    
            let amount = settings.str + greyOffset + 35;
            
            if(amount < 0) amount = 0;

            color = adjustBrightness(color, amount);

            css += `[d__="${++this.c}"]{color:${color}!important}\n`;
        }

        node.setAttribute("d__", this.c);
    }

    if(db) console.table(dbArr);

    if(settings.advDimming) 
    {
        return css;
    }
}

function createElem() {
    const doc = document;

    x = doc.createElement("style");
    doc.head.appendChild(x);

    x.setAttribute("id", "_fc_");

    t = doc.createTextNode("");
}

function init() 
{
    if (!document.getElementById("_fc_"))
    {
    //this.isInit = true;
    createElem();

    const doc = document;
    let db = 0;

    let init = (items) => {

        let settings = {
            str:          items.globalStr,
            size:         items.size,
            sizeLimit:    items.sizeThreshold,
            skipHeadings: items.skipHeadings, 
            skipColoreds: items.skipColoreds, 
            advDimming:   items.advDimming, 
            outline:      outline = false, 
            boldText:     items.boldText, 
            forcePlhdr:   items.forcePlhdr,
        };

        let domain = extractRootDomain(String(window.location));

        let whitelist = items.whitelist || [];
        
        let idx = whitelist.findIndex(o => o.url === domain);

        if(idx > -1) 
        {
            let wlItem = whitelist[idx];

            settings.str          = wlItem.strength;
            settings.size         = wlItem.size;
            settings.sizeLimit    = wlItem.threshold;
            settings.skipHeadings = wlItem.skipHeadings;
            settings.skipColoreds = wlItem.skipColoreds; 
            settings.advDimming   = wlItem.advDimming;
            settings.outline      = wlItem.outline;
            settings.boldText     = wlItem.boldText;
            settings.forcePlhdr   = wlItem.forcePlhdr;
        } 

        let dbStr = "Website processed in";
        if(db) console.time(dbStr);

        let elems = [];
        elems = nodeListToArr(document.body.getElementsByTagName("*"));

        settings.str = parseInt(settings.str);

        if(items.smoothEnabled)
        {
            const doc = document;
            let y = doc.createElement("style");
            doc.head.appendChild(y);
            y.setAttribute("id", "_fct_");

            let smoothSize;
            settings.size > 0 ? smoothSize = " font-size" : "";

            let z = doc.createTextNode(`[d__],[d__][style]{
                transition: color,${smoothSize} .25s linear!important;
            }`);

            y.appendChild(z);
        }

        let boldStr = "";
        if(settings.boldText) boldStr = "*{font-weight:bold!important}";

        let force = "";
        if(settings.forcePlhdr) force = "color:black!important";

        let plhdrStr = `::placeholder{opacity:1!important;${force}}`;

        let sizeStr = "";

        if(settings.size > 0) 
        {
            let i = 1;
            
            while(i <= settings.sizeLimit) //threshold
            {
                sizeStr += `[s__="${i}"]{font-size: calc(${i++}px + ${settings.size}%)!important}\n`;
            }
        }

        let borderStr = "[b__]{border:1px solid black!important}";
        
        let css = `
        ${sizeStr}
        ${boldStr}
        ${plhdrStr}
        ${borderStr}
        `;

        css += '[d__]{';

        if(settings.advDimming) {
            css += '}';
            css += process(elems, settings);
        }
        else {
            let colorStr = "color:black!important}";
            css += colorStr;
            process(elems, settings);
        }

        t.nodeValue = css;

        if(db) console.timeEnd(dbStr);

        /* New elements */
        dbStr = "New elements processed in";

        let callback = (mutationsList) => {

            let newRules = "";

            mutationsList.forEach((mutation) => {
                if(mutation.addedNodes && mutation.addedNodes.length > 0)
                {
                    if(db) console.time(dbStr);
                
                    for(let i = 0, len = mutation.addedNodes.length; i < len; ++i)
                    {
                        const node = mutation.addedNodes[i];

                        if(node instanceof HTMLElement)
                        {
                            let children = [];
                            children = nodeListToArr(node.getElementsByTagName("*"));
                            children.push(node);

                            if(settings[2]) {
                                newRules += process(children, settings);
                            }
                            else process(children, settings);
                        }
                    }
                    if(db) console.timeEnd(dbStr);
                }
            });

            if(settings[2] && newRules.length > 0)
            {
                css += newRules;
                t.nodeValue = css;
            }
        };//callback

        const observer = new MutationObserver(callback);

        observer.observe(doc.body, {childList: true, subtree: true});

        x.appendChild(t);
    };

    let stored = [
        "whitelist", 
        "blacklist", 
        "globalStr",
        "size",
        "sizeThreshold", 
        "skipColoreds", 
        "skipHeadings", 
        "advDimming", 
        "boldText", 
        "forcePlhdr",
        "smoothEnabled"
    ];

    browser.storage.local.get(stored, init);
    }
    else x.appendChild(t);
}

init();

chrome.runtime.sendMessage({from: "yo", t: true});