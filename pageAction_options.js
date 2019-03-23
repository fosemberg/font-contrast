/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

const storage = chrome.storage.local;
const doc = document;

let strSlider       = doc.querySelector("#strSlider");
let strLabel        = doc.querySelector("#strLabel");

let sizeSlider      = doc.querySelector("#sizeSlider");
let sizeLabel       = doc.querySelector("#sizeLabel");

let thresholdSlider = doc.querySelector("#thresholdSlider");
let thresholdLabel  = doc.querySelector("#thresholdLabel");

let urlSpan         = doc.querySelector("#url");

let WLcheck         = doc.querySelector("#addWL");
let BLcheck         = doc.querySelector("#addBL");

let skipColoreds    = doc.querySelector("#skipColoreds");
let skipHeadings    = doc.querySelector("#skipHeadings");
let advDimming      = doc.querySelector("#advDimming");
let outline         = doc.querySelector("#outline");
let boldText        = doc.querySelector("#boldText");
let forcePlhdr      = doc.querySelector("#forcePlhdr");

let optionsBtn      = doc.querySelector("#optionsBtn");
let refreshBtn      = doc.querySelector("#refreshBtn");

let isURLshown = false;

optionsBtn.addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) 
    {
        chrome.runtime.openOptionsPage();
    } 
    else 
    {
        window.open(chrome.runtime.getURL('options.html'));
    }
});

function extractHostname(url) {
  let hostname;
  //find and remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("://") > -1) {
      hostname = url.split('/')[2];
  }
  else {
      hostname = url.split('/')[0];
  }

  //find and remove port number
  hostname = hostname.split(':')[0];
  //find and remove "?"
  hostname = hostname.split('?')[0];
  hostname = hostname.replace('www.', '');
  return hostname;
}

function extractRootDomain(url) {
  let domain = extractHostname(url),
      splitArr = domain.split('.'),
      arrLen = splitArr.length;

  //extracting the root domain here
  //if there is a subdomain 
  if (arrLen > 2) {
      domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
      //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
      if (splitArr[arrLen - 1].length === 2 && splitArr[arrLen - 1].length === 2) {
          //this is using a ccTLD
          domain = splitArr[arrLen - 3] + '.' + domain;
      }
  }

  return domain;
}

function showRefreshBtn() {
    if(!isURLshown) 
    {
        urlSpan.style.opacity = 0;
        urlSpan.style.cursor = "context-menu";
      
        refreshBtn.style.opacity = 1;
        refreshBtn.style.cursor = "pointer";
      
        refreshBtn.addEventListener("click", () => {
          browser.tabs.reload();
        });

        isURLshown = true;
    }
}

function updateWL(obj, whitelist, domain, add) 
{
    let idx = whitelist.findIndex(o => o.url === domain);

    if(add)
    {
        if(idx > -1)
        {
            whitelist[idx] = obj;
        } 
        else whitelist.push(obj);

        WLcheck.checked = true;
    }
    else if(idx > -1) 
    {
        whitelist.splice(idx, 1);
        WLcheck.checked = false;
    }

    storage.set({"whitelist": whitelist});

    showRefreshBtn();

    return whitelist;
}

function updateBL(blacklist, domain, add) 
{
    let idx = blacklist.findIndex(o => o.url === domain);

    if(add && idx === -1) 
    {
        blacklist.push({url:domain});
        BLcheck.checked = true;
    }
    else if(idx > -1) 
    {
        blacklist.splice(idx, 1);
        BLcheck.checked = false;
    }

    storage.set({"blacklist": blacklist});

    showRefreshBtn();

    return blacklist;
}

let callback = (tabs) => {
    let url = tabs[0].url;

    let domain = extractRootDomain(String(url));

    if(url.startsWith("http")) urlSpan.innerText = domain;

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
        "forceOpacity"
    ];

    storage.get(stored, (items) => 
    {    
        let whitelist = items.whitelist || [];
        let blacklist = items.blacklist || [];

        let globalChecks = [
            items.skipHeadings,
            items.skipColoreds, 
            items.advDimming, 
            items.boldText, 
            items.forcePlhdr,
            items.forceOpacity
        ];

        if (blacklist.findIndex(o => o.url === domain) > -1)
        {
            BLcheck.checked = true;
        }
        else 
        {
            let idx = whitelist.findIndex(o => o.url === domain);
        
            if(idx > -1)
            {
                let wlItem = whitelist[idx];

                strSlider.value           = wlItem.strength;
                strLabel.innerText        = wlItem.strength;
                sizeSlider.value          = wlItem.size;
                sizeLabel.innerText       = wlItem.size;
                thresholdSlider.value     = wlItem.threshold;
                thresholdLabel.innerText  = wlItem.threshold;

                skipHeadings.checked      = wlItem.skipHeadings;
                skipColoreds.checked      = wlItem.skipColoreds;
                advDimming.checked        = wlItem.advDimming;
                outline.checked           = wlItem.outline;
                boldText.checked          = wlItem.boldText;
                forcePlhdr.checked        = wlItem.forcePlhdr;
                forceOpacity.checked      = wlItem.forceOpacity;

                WLcheck.checked = true;
                BLcheck.checked = false;
            }
            else 
            {
                strSlider.value           = items.globalStr;
                sizeSlider.value          = items.size;
                thresholdSlider.value     = items.sizeThreshold;
                strLabel.innerText        = items.globalStr;
                sizeLabel.innerText       = items.size;
                thresholdLabel.innerText  = items.sizeThreshold;

                skipHeadings.checked      = globalChecks[0];
                skipColoreds.checked      = globalChecks[1];
                advDimming.checked        = globalChecks[2];
                boldText.checked          = globalChecks[3];
                forcePlhdr.checked        = globalChecks[4];
                forceOpacity.checked      = globalChecks[5];
            }
        }

        let wlItem = {
            url:            domain, 
            strength:       items.globalStr,
            size:           items.size,
            threshold:      items.sizeThreshold,

            skipHeadings:   globalChecks[0], 
            skipColoreds:   globalChecks[1], 
            advDimming:     globalChecks[2],
            boldText:       globalChecks[3],
            forcePlhdr:     globalChecks[4],
            forceOpacity:   globalChecks[5],
            outline:        false, //The outline cannot be set globally for now
   
        };

        let updateWLItem = () => {
            wlItem.strength     = strSlider.value;
            wlItem.size         = sizeSlider.value;
            wlItem.threshold    = thresholdSlider.value;
            wlItem.skipColoreds = skipColoreds.checked;
            wlItem.skipHeadings = skipHeadings.checked;
            wlItem.advDimming   = advDimming.checked;
            wlItem.outline      = outline.checked;
            wlItem.boldText     = boldText.checked;
            wlItem.forcePlhdr   = forcePlhdr.checked;
            wlItem.forceOpacity = forceOpacity.checked;
        };

        strSlider.oninput = () =>
        {
            let str = strSlider.value;
            strLabel.innerText = str;

            updateWLItem();

            if(BLcheck.checked)
            {
                blacklist = updateBL(blacklist, domain, false);
            }

            whitelist = updateWL(wlItem, whitelist, domain, true);
        };

        sizeSlider.oninput = () =>
        {
            let sizeOffset = sizeSlider.value;
            sizeLabel.innerText = sizeOffset;

            updateWLItem();

            if(BLcheck.checked)
            {
                blacklist = updateBL(blacklist, domain, false);
            }

            whitelist = updateWL(wlItem, whitelist, domain, true);
        };

        thresholdSlider.oninput = () =>
        {
            let sizeThreshold = thresholdSlider.value;
            thresholdLabel.innerText = sizeThreshold;

            updateWLItem();

            if(BLcheck.checked)
            {
                blacklist = updateBL(blacklist, domain, false);
            }

            whitelist = updateWL(wlItem, whitelist, domain, true);
        };


        WLcheck.addEventListener("click", () => {
            let isChecked = WLcheck.checked;

            whitelist = updateWL(wlItem, whitelist, domain, isChecked);

            if(isChecked)
            { 
                let idx = blacklist.findIndex(o => o.url === domain);
                
                if(idx > -1) 
                {
                    updateBL(blacklist, domain, false);
                }
            }
        });

        BLcheck.addEventListener("click", () => {
            let isChecked = BLcheck.checked;

            blacklist = updateBL(blacklist, domain, isChecked);

            if(isChecked)
            { 
                let idx = whitelist.findIndex(o => o.url === domain);

                if(idx > -1)
                {
                    whitelist = updateWL(wlItem, whitelist, domain, false);
                }
            }
        });

        skipColoreds.addEventListener("click", () => {
            updateWLItem();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        skipHeadings.addEventListener("click", () => {
            updateWLItem();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        advDimming.addEventListener("click", () => {
            updateWLItem();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        outline.addEventListener("click", () => {
            updateWLItem();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        boldText.addEventListener("click", () => {
            updateWLItem();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        forcePlhdr.addEventListener("click", () => {
            updateWLItem();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        forceOpacity.addEventListener("click", () => {
            updateWLItem();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

    });
};

chrome.tabs.query({active:true, currentWindow:true}, callback);