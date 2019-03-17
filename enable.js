/**Enable.js 
 * Fushko
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

    let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; //itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.709-6-201506-I!!PDF-E.pdf
    
    luma = parseFloat(luma.toFixed(1));
    
    return luma;
}

function calcDelta(rgbString) {
    let colors = getRGBarr(rgbString);

    let r, g, b, a;
    r = colors[0];
    g = colors[1];
    b = colors[2];
    a = colors[3];

    let delta = 0;
    delta += Math.abs(r-g);  //Naive as hell, but works okayish
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

function process(nodes, str, checks)
{
    if(typeof this.c === "undefined") this.c = 0;

    const black = "rgb(0, 0, 0)", white = "rgb(255, 255, 255)", transparent = "rgba(0, 0, 0, 0)";
    let tagsToSkip = ["script", "link", "meta", "style", "img", "video", "#comment"];
    const classesToSkip = ["home_featured_story-date"]; //genius
    const headings = ["h1", "h2", "h3"];

    let css = "";

    if(checks[0]) //Skip headers
    {  
        tagsToSkip = tagsToSkip.concat(headings);
    }

    //let dbArr = [];

    for(let i = 0, len = nodes.length; i < len; ++i)
    {
        let node = nodes[i];

        let tag = String(node.localName), classe = String(node.className), id = String(node.id);

        if(checks[3] && tag === "input" && node.type != "submit") 
        {
            node.setAttribute("b__", "");
        }
    
        if(!containsText(node) || !tag || ~tagsToSkip.indexOf(tag) || classe.startsWith("ytp") || ~classesToSkip.indexOf(classe)) continue;
     
        let color = getComputedStyle(node, null).getPropertyValue("color");

        if(color === black || color === white || color === transparent) continue;
       
        let saturation = calcDelta(color);

        if(checks[1]) //Skip colored text & links
        {
            let offset = 0;
            if(tag === "a") offset = -32; 
            let val = 32 + str + offset;

            if(saturation > val /*|| luma > 180*/) continue;
        }
      
        let bgColor = getComputedStyle(node, null).getPropertyValue("background-color");

        let parent = node.parentNode;

        while (bgColor === transparent && parent)
        {
            if(parent instanceof HTMLElement) 
            {
                bgColor = getComputedStyle(parent, null).getPropertyValue("background-color");
            }
    
            parent = parent.parentNode;
        }
       
        let luma = calcLuma(color);
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
    
        let bgLumaOffset = bgLuma + str;

        /*Logging
        let dimmed = luma < bgLumaOffset;
        let obj = {tag, color, bgColor, luma, bgLuma, bgLumaOffset, dimmed};
        dbArr.push(obj);*/

        if(luma > bgLumaOffset) continue;

        if(checks[2]) //Advanced mode
        {
            let greyOffset = 16;
            greyOffset -= saturation;
    
            let amount = str + greyOffset + 35;
            
            if(amount < 0) amount = 0;

            color = adjustBrightness(color, amount);

            css += `[d__="${++this.c}"]{color:${color}!important}\n`;
        }

        node.setAttribute("d__", this.c);
    }

    //console.table(dbArr);

    if(checks[2]) 
    {
        return css;
    }
}

/*Deprecated*/
function enable() {
    let css = t.nodeValue;
    
    css = css.replace(/_x_/g, "rgb");
    css = css.replace(/_xxx_/, "black");
    css = css.replace(/_o_/, "opacity:1");

    t.nodeValue = css;
}

function createElem() {
    const doc = document;

    x = doc.createElement("style");
    doc.head.appendChild(x);

    x.setAttribute("id", "_fc_");

    t = doc.createTextNode("");
}

if (!document.getElementById("_fc_"))
{
    //this.isInit = true;
    createElem();

    const doc = document;
    let debug = 0;

    let init = (items) => {
        let str               = items.globalStr;
        let skipHeadings      = items.skipHeadings;
        let skipColoreds      = items.skipColoreds;
        let advDimming        = items.advDimming;
        let boldText          = items.boldText;
        let forcePlhdr        = items.forcePlhdr;

        let checks = [skipHeadings, skipColoreds, advDimming, outline = false, boldText, forcePlhdr];

        let domain = extractRootDomain(String(window.location));

        let whitelist = items.whitelist || [];
        
        let idx = whitelist.findIndex(o => o.url === domain);

        if(idx > -1) 
        {
                  str = whitelist[idx].strength;
            checks[0] = whitelist[idx].skipHeadings;
            checks[1] = whitelist[idx].skipColoreds; 
            checks[2] = whitelist[idx].advDimming;
            checks[3] = whitelist[idx].outline;
            checks[4] = whitelist[idx].boldText;
            checks[5] = whitelist[idx].forcePlhdr;
        } 

        let dbStr = "Website processed in";
        if(debug) console.time(dbStr);

        let elems = [];
        elems = nodeListToArr(document.body.getElementsByTagName("*"));

        str = parseInt(str);

        if(items.smoothEnabled)
        {
            const doc = document;
            let y = doc.createElement("style");
            doc.head.appendChild(y);
            y.setAttribute("id", "_fct_");
            let z = doc.createTextNode("[d__],[d__][style]{transition:color 0.25s linear!important;}");
            y.appendChild(z);
        }

        let bold = "";
        if(checks[4]) bold = "*{font-weight:bold!important}";

        let force = "";
        if(checks[5]) force = "color:black!important";

        let css = `${bold}::placeholder{opacity:1!important;${force}}[b__]{border:1px solid black!important}`;

        css += '[d__]{';

        if(checks[2]) { //Advanced mode
            css += '}';
            css += process(elems, str, checks);
        }
        else {
            let colorStr = "color:black!important}";
            css += colorStr;
            process(elems, str, checks);
        }

        t.nodeValue = css;

        if(debug) console.timeEnd(dbStr);

        /*New elements----------------------------------*/
        dbStr = "New elements processed in";

        let callback = (mutationsList) => {

            let newRules = "";

            mutationsList.forEach((mutation) => {
                if(mutation.addedNodes && mutation.addedNodes.length > 0)
                {
                    if(debug) console.time(dbStr);
               
                    for(let i = 0, len = mutation.addedNodes.length; i < len; ++i)
                    {
                        const node = mutation.addedNodes[i];

                        if(node instanceof HTMLElement)
                        {
                            //process(node, str, checks);
                            let children = [];
                            children = nodeListToArr(node.getElementsByTagName("*"));
                            children.push(node);

                            if(checks[2]) {
                                newRules += process(children, str, checks);
                            }
                            else process(children, str, checks);
                        }
                    }
                    if(debug) console.timeEnd(dbStr);
                }
            });

            if(checks[2] && newRules.length > 0)
            {
                css += newRules;
                t.nodeValue = css;
            }
        };//callback

        const observer = new MutationObserver(callback);
    
        observer.observe(doc.body, {childList: true, subtree: true});

        x.appendChild(t);
    };

    browser.storage.local.get([
    "globalStr",
    "whitelist",
    "skipHeadings",
    /*"skipLinks",*/
    "skipColoreds",
    "smoothEnabled",
    "advDimming",
    "boldText",
    "forcePlhdr"
    ], init);
}
else x.appendChild(t);

chrome.runtime.sendMessage({from: "yo", t: true});