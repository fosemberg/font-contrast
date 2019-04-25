/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

"use strict";
const storage = chrome.storage.local;
const doc = document;

//Sliders
let strSlider       = doc.querySelector("#strSlider");
let strLabel        = doc.querySelector("#strLabel");
let sizeSlider      = doc.querySelector("#sizeSlider");
let sizeLabel       = doc.querySelector("#sizeLabel");
let threshSlider    = doc.querySelector("#threshSlider");
let threshLabel     = doc.querySelector("#threshLabel");

strSlider.oninput = () => {
    let val = strSlider.value;
    strLabel.innerText = val;
    storage.set({globalStr: val});
};

sizeSlider.oninput = () => {
    let val = sizeSlider.value;
    sizeLabel.innerText = val;
    storage.set({"size": val});
};

threshSlider.oninput = () => {
    let val = threshSlider.value;
    threshLabel.innerText = val;
    storage.set({"sizeThreshold": val});
};

//Options
let skipHeadings    = doc.querySelector('#skipHeadings');
let skipColoreds    = doc.querySelector('#skipColoreds');
let globalEnabled   = doc.querySelector('#defaultEn');
let smoothEnabled   = doc.querySelector('#smoothEnabled');
let advDimming      = doc.querySelector('#advDimming');
let boldText        = doc.querySelector('#boldText');
let forcePlhdr      = doc.querySelector('#forcePlhdr');
let forceOpacity    = doc.querySelector('#forceOpacity');
let skipWhites      = doc.querySelector('#skipWhites');
let underlineLinks  = doc.querySelector('#underlineLinks');

globalEnabled = addEventListener('click', () => {
    storage.set({'enableEverywhere': isChecked("defaultEn")});
});

skipHeadings += addEventListener('click', () => {
    storage.set({'skipHeadings': isChecked("skipHeadings")});
});

skipColoreds += addEventListener('click', () => {
    storage.set({'skipColoreds': isChecked("skipColoreds")});
});

advDimming += addEventListener('click', () => {
    storage.set({'advDimming': isChecked("advDimming")});
});

smoothEnabled = addEventListener('click', () => {
    storage.set({'smoothEnabled': isChecked("smoothEnabled")});
});

boldText = addEventListener('click', () => {
    storage.set({'boldText': isChecked("boldText")});
});

forcePlhdr = addEventListener('click', () => {
    storage.set({'forcePlhdr': isChecked("forcePlhdr")});
})

forceOpacity = addEventListener('click', () => {
    storage.set({'forceOpacity': isChecked("forceOpacity")});
})

skipWhites = addEventListener('click', () => {
    storage.set({'skipWhites': isChecked("skipWhites")});
})

underlineLinks = addEventListener('click', () => {
    storage.set({'underlineLinks': isChecked("underlineLinks")});
})

function isChecked(arg) {
    return doc.getElementById(arg).checked;
}

//Whitelist
let WLtable       = doc.querySelector('#whitelist');
let addButton     = doc.querySelector('#add');
let resetButton   = doc.querySelector('#reset');
let textarea      = doc.querySelector('#urltext');
let header        = doc.getElementById("header");
let WLtbody       = doc.querySelector("#WLtbody");
let rowCount      = 0;

//Blacklist
let BLtable       = doc.querySelector('#blacklist');
let BLaddButton   = doc.querySelector('#BLadd');
let BLresetButton = doc.querySelector('#BLreset');
let BLtextarea    = doc.querySelector('#BLurltext');
let BLheader      = doc.getElementById("BLheader");
let BLtbody       = doc.querySelector("#BLtbody");
let BLrowCount    = 0;

header.style.display   = "none";
BLheader.style.display = "none";

let wl = [];
let bl = [];

addButton.addEventListener('click', addDomain.bind(this, true));
resetButton.addEventListener('click', reset.bind(this, true));

BLaddButton.addEventListener('click', addDomain.bind(this, false));
BLresetButton.addEventListener('click', reset.bind(this, false));

doc.getElementById("welcome").addEventListener("click", () => {
    browser.tabs.create({url: "Welcome.html"});
});

updateSettings();

function updateSettings() 
{
    storage.get(['globalStr', 'size', 'sizeThreshold'], (items) => {
        strSlider.value       = items.globalStr;
        strLabel.innerText    = items.globalStr;

        sizeSlider.value      = items.size;
        sizeLabel.innerText   = items.size;
        
        threshSlider.value    = items.sizeThreshold;
        threshLabel.innerText = items.sizeThreshold;
    });

    let checks = [
        "enableEverywhere",
        "skipColoreds", 
        "skipHeadings", 
        "advDimming", 
        "boldText", 
        "forceOpacity",
        "forcePlhdr",
        "smoothEnabled",
        "skipWhites",
        "underlineLinks"
    ];

    storage.get(checks, (i) => {
        doc.getElementById("defaultEn").checked      = i.enableEverywhere;
        doc.getElementById("skipColoreds").checked   = i.skipColoreds;
        doc.getElementById("skipHeadings").checked   = i.skipHeadings;
        doc.getElementById("advDimming").checked     = i.advDimming;
        doc.getElementById("boldText").checked       = i.boldText;
        doc.getElementById("forceOpacity").checked   = i.forceOpacity;
        doc.getElementById("forcePlhdr").checked     = i.forcePlhdr;
        doc.getElementById("smoothEnabled").checked  = i.smoothEnabled;
        doc.getElementById("skipWhites").checked     = i.skipWhites;
        doc.getElementById("underlineLinks").checked = i.underlineLinks;
    });

    storage.get(['whitelist', 'blacklist'], (items) => {      
        if(items.whitelist) 
        {
            let len = items.whitelist.length;
            len > 0 ? header.style.display = "table-row" : header.style.display = "none";
            
            for(let i = 0; i < len; ++i) addRow(true, items.whitelist[i].url);
        }

        if(items.blacklist) 
        {
            let len = items.blacklist.length;
            len > 0 ? BLheader.style.display = "table-row": BLheader.style.display = "none";
            
            for(let i = 0; i < len; ++i) addRow(false, items.blacklist[i].url);
        }
    });
}

function addDomain(isWhitelist) 
{
    let domain;

    storage.get(['whitelist', 'blacklist'], (items) => 
    {
        wl = items.whitelist || [];
        bl = items.blacklist || [];

        if(isWhitelist)
        {
            domain = textarea.value;
            domain = domain.trim(); 

            if(!isInputValid(domain, wl, bl, true)) return;
            else 
            {
                let wlItem = {
                    url: domain, 
                    strength: strSlider.value, 
                    skipHeadings: isChecked("skipHeadings"), 
                    skipColoreds: isChecked("skipColoreds"), 
                    advDimming: isChecked("advDimming")
                }

                wl.push(wlItem);

                storage.set({'whitelist': wl});
                addRow(true, domain);
            }
        }
        else
        {
            domain = BLtextarea.value;
            domain = domain.trim();

            if(!isInputValid(domain, wl, bl, false)) return;
            else 
            {
                bl.push({url: domain});
                storage.set({'blacklist': bl});
                addRow(false, domain);
            }
        }
    });
}

function addRow(isWhitelist, url) 
{
    let row, urlCell;
    let strCell;
    let remBtn, btnCell;

    remBtn = doc.createElement("button");
    remBtn.innerText = "Remove";
    remBtn.setAttribute("class", "remove");

    if(isWhitelist) 
    {
        row = WLtbody.insertRow(-1);

        urlCell = row.insertCell(0);
        urlCell.innerText = url;

        strCell = row.insertCell(1);

        storage.get(['whitelist', 'globalStr'], (items) => 
        {
            wl = items.whitelist;
            
            let idx = wl.findIndex(o => o.url === urlCell.innerText);

            if(idx > -1) strCell.innerText = wl[idx].strength;

            urlCell.setAttribute("contenteditable", "true");
            strCell.setAttribute("contenteditable", "true");

            urlCell.addEventListener("keyup", () => {
                wl[idx].url = urlCell.innerText;

                storage.set({'whitelist': wl});
            });

            strCell.addEventListener("keyup", (e) => {
                let newStr = strCell.innerText;

                newStr = parseInt(newStr);
        
                if(newStr > 100) newStr = 100;
                else if(newStr < -100) newStr = -100;

                //Calculate the index again, because the list gets shifted when removing items on top
                wl[wl.findIndex(o => o.url === urlCell.innerText)].strength = newStr || items.globalStr;

                storage.set({'whitelist': wl});
            });

            strCell.addEventListener("keydown", (e) => {
                /*
                Keyup/Keydown event codes
                left arrow:   e.which = 37,  e.keyCode = 37
                right arrow:  e.which = 39,  e.keyCode = 39
                backspace:    e.which = 8,   e.keyCode = 8
                dash:         e.which = 173, e.keyCode = 173
                enter:        e.which = 13,  e.keyCode = 13

                Keypress event codes
                left arrow:  e.which = 0,  e.keyCode = 37, e.charCode = 0
                right arrow: e.which = 0,  e.keyCode = 39, e.charCode = 0
                backspace:   e.which = 8,  e.keyCode = 8, e.charCode = 0
                dash:        e.which = 45, e.keyCode = 0, e.charCode = 45

                Keyup doesn't lag behind one character, but preventDefault() doesn't work.
                */

                let allowedKeys = [8, 37, 39, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 173];

                let isAllowed = allowedKeys.includes(e.keyCode) || allowedKeys.includes(e.which);
            
                if(!isAllowed)
                {
                    e.preventDefault();
                }
            });

            remBtn.addEventListener("click", () => {
                WLtbody.deleteRow(row.rowIndex - 1);
        
                rowCount--;
                if(!rowCount) header.style.display = "none";

                wl.splice(wl.findIndex(o => o.url === urlCell.innerText), 1);
                storage.set({'whitelist': wl});
            });
        });

        btnCell = row.insertCell(2);
        btnCell.appendChild(remBtn);
        
        if(!rowCount) header.style.display = "table-row";
        rowCount++;
    }
    else //Blacklist
    {
        row = BLtbody.insertRow(-1);
        urlCell = row.insertCell(0);
        urlCell.innerText = url;

        btnCell = row.insertCell(1);
        btnCell.appendChild(remBtn);
        
        if(!BLrowCount) BLheader.style.display = "table-row";
        BLrowCount++;

        urlCell.setAttribute("contenteditable", "true");

        storage.get('blacklist', (items) => 
        {
            bl = items.blacklist;

            let idx = bl.findIndex(o => o.url === urlCell.innerText);

            urlCell.addEventListener("keyup", () => {
                bl[idx].url = urlCell.innerText;
            
                storage.set({'blacklist': bl});
            });

            remBtn.addEventListener("click", () => {
                BLtbody.deleteRow(row.rowIndex - 1);

                BLrowCount--;
                if(!BLrowCount) BLheader.style.display = "none";

                bl.splice(bl.findIndex(o => o.url === urlCell.innerText), 1);
                
                storage.set({'blacklist': bl});
            });
        });
    }
}

function isInputValid(domain, whitelist, blacklist, isWhitelist) 
{
    if(domain.length < 3) {
        message("Input is too short.", isWhitelist);
        return false;
    }
    else if(domain.length > 80) {
        message("Exceeded limit of 80 characters.", isWhitelist);
        return false;
    }
 
    if(isWhitelist) 
    {
        if(whitelist.length > 255) {
            message('Exceeded limit of 256 items.', isWhitelist);
            return false;
        }

        if(whitelist.find(o => o.url === domain)) {
            message("It's already there.", isWhitelist);
            return false;
        }

        let idx = blacklist.findIndex(o => o.url === domain);

        if(idx > -1) 
        {
            blacklist.splice(idx, 1);
            storage.set({"blacklist": blacklist});

            BLtbody.deleteRow(idx);
            BLrowCount--;
            if(!BLrowCount) BLheader.style.display = "none";
        }
    }
    else 
    {
        if(blacklist.length > 255) {
            message('Exceeded limit of 256 items.', isWhitelist);
            return false;
        }

        if(blacklist.find(o => o.url === domain)) {
            message("It's already there.", isWhitelist);
            return false;
        }

        let idx = whitelist.findIndex(o => o.url === domain);

        if(idx > -1)
        {
            whitelist.splice(idx, 1);
            storage.set({"whitelist": whitelist});

            WLtbody.deleteRow(idx);
            rowCount--;
            if(!rowCount) header.style.display = "none";
        }
    }

    return true;
}

function reset(isWhitelist) {
    if(isWhitelist) 
    {
        storage.remove('whitelist');
        wl = [];
        header.style.display ="none";
        WLtbody.innerHTML = "";
        rowCount = 0;
    }
    else 
    {
        storage.remove('blacklist');
        bl = [];
        BLheader.style.display ="none";
        BLtbody.innerHTML = "";
        BLrowCount = 0;
    }
}

function message(msg, whitelist) {
    let message;

    if(whitelist) {
        message = doc.querySelector('#msg');
        message.innerText = msg;
        setTimeout(() => { message.innerText = ''; }, 3000);
    }
    else {
        message = doc.querySelector('#BLmsg');
        message.innerText = msg;
        setTimeout(() => { message.innerText = ''; }, 3000);
    }
}