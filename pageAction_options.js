/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

const storage = chrome.storage.local;
const doc = document;

let slider = doc.querySelector("#slider");
let sliderStr = doc.querySelector("#str");

let urlSpan = doc.querySelector("#url");

let WLcheck = doc.querySelector("#addWL");
let BLcheck = doc.querySelector("#addBL");
let skipColoreds = doc.querySelector("#skipColoreds");
let skipHeadings = doc.querySelector("#skipHeadings");
let advDimming = doc.querySelector("#advDimming");
let outline = doc.querySelector("#outline");
let boldText = doc.querySelector("#boldText");
let forcePlhdr = doc.querySelector("#forcePlhdr");

let optionsBtn = doc.querySelector("#optionsBtn");
let refreshBtn = doc.querySelector("#refreshBtn");

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

    storage.get(["whitelist", "blacklist", "globalStr", "skipColoreds", "skipHeadings", "advDimming", "boldText", "forcePlhdr"], (items) => 
    {    
        let whitelist = items.whitelist || [];
        let blacklist = items.blacklist || [];

        let globalChecks = [items.skipHeadings, items.skipColoreds, items.advDimming, items.boldText, items.forcePlhdr];

        if (blacklist.findIndex(o => o.url === domain) > -1)
        {
            BLcheck.checked = true;
        }
        else 
        {
            let idx = whitelist.findIndex(o => o.url === domain);
        
            if(idx > -1)
            {
                slider.value         = whitelist[idx].strength;
                sliderStr.innerText  = whitelist[idx].strength;
                skipHeadings.checked = whitelist[idx].skipHeadings;
                skipColoreds.checked = whitelist[idx].skipColoreds;
                advDimming.checked   = whitelist[idx].advDimming;
                outline.checked      = whitelist[idx].outline;
                boldText.checked     = whitelist[idx].boldText;
                forcePlhdr.checked   = whitelist[idx].forcePlhdr;
    
                WLcheck.checked = true;
                BLcheck.checked = false;
            }
            else 
            {
                slider.value = items.globalStr;
                sliderStr.innerText = items.globalStr;

                skipHeadings.checked = globalChecks[0];
                skipColoreds.checked = globalChecks[1];
                advDimming.checked   = globalChecks[2];
                boldText.checked     = globalChecks[3];
                forcePlhdr.checked   = globalChecks[4];
            }
        }

        let wlItem = {
            url: domain, 
            strength: items.globalStr,
            skipHeadings: globalChecks[0], 
            skipColoreds: globalChecks[1], 
            advDimming:   globalChecks[2],
            outline: false,
            boldText: globalChecks[3],
            forcePlhdr: globalChecks[4]
        };

        slider.oninput = () =>
        {
            let str = slider.value;
            sliderStr.innerText = str;

            wlItem.strength     = str;
            wlItem.skipHeadings = skipHeadings.checked;
            wlItem.skipColoreds = skipColoreds.checked;
            wlItem.advDimming   = advDimming.checked;
            wlItem.outline      = outline.checked;
            wlItem.boldText     = boldText.checked;
            wlItem.forcePlhdr   = forcePlhdr.checked;

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

        let updateWLItems = () => {
            wlItem.strength = slider.value;
            wlItem.skipColoreds = skipColoreds.checked;
            wlItem.skipHeadings = skipHeadings.checked;
            wlItem.advDimming = advDimming.checked;
            wlItem.outline = outline.checked;
            wlItem.boldText = boldText.checked;
            wlItem.forcePlhdr = forcePlhdr.checked;
        };
        
        skipColoreds.addEventListener("click", () => {
            updateWLItems();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        skipHeadings.addEventListener("click", () => {
            updateWLItems();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        advDimming.addEventListener("click", () => {
            updateWLItems();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        outline.addEventListener("click", () => {
            updateWLItems();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        boldText.addEventListener("click", () => {
            updateWLItems();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

        forcePlhdr.addEventListener("click", () => {
            updateWLItems();

            whitelist = updateWL(wlItem, whitelist, domain, true);

            if(BLcheck.checked) blacklist = updateBL(blacklist, domain, false);
        });

    });
};

chrome.tabs.query({active:true, currentWindow:true}, callback);